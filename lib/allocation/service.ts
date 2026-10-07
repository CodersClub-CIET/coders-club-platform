import { createClient } from "@/lib/supabase/client";
import {
  AllocationFilter,
  AssociateAllocation,
  AssociateAllocationInsert,
  AssociateAllocationRow,
  AssociateAllocationUpdate,
  AssociateReference,
  CreateAllocationInput,
  EventReference,
  UpdateAllocationInput,
  mapRowToAllocation,
} from "./types";
import {
  validateCompleteAllocation,
  validateCreateAllocationInput,
  validateUpdateAllocationInput,
} from "./validation";

/**
 * Associate Allocation Service
 *
 * Provides real Supabase PostgreSQL CRUD operations for the `associate_allocations` table.
 *
 * Database schema:
 * - id: uuid primary key
 * - associate_id: uuid NOT NULL (references associates.id)
 * - event_node_id: uuid NOT NULL (references event_nodes.id)
 * - attendance_access: boolean NOT NULL DEFAULT false
 * - is_active: boolean NOT NULL DEFAULT true
 * - assigned_by: uuid NULL (references user_profiles.id)
 * - assigned_at: timestamptz NOT NULL DEFAULT now()
 *
 * Unique constraint: associate_event_allocation_unique (associate_id, event_node_id)
 */
class AssociateAllocationService {
  /**
   * Helper to resolve the authenticated user ID from the active Supabase session.
   */
  private async getAuthenticatedUserId(): Promise<string | null> {
    try {
      const supabase = createClient();
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session?.user?.id) {
        return null;
      }

      return session.user.id;
    } catch {
      return null;
    }
  }

  /**
   * List allocations from Supabase with optional filters.
   *
   * @param filter - Optional filters for event, associate, status, or search query
   * @returns Array of AssociateAllocation records
   */
  async getAllocations(
    filter?: AllocationFilter
  ): Promise<AssociateAllocation[]> {
    const supabase = createClient();

    let query = supabase
      .from("associate_allocations")
      .select("*")
      .order("assigned_at", { ascending: false });

    const targetNodeId = filter?.eventNodeId || filter?.eventId;
    if (targetNodeId) {
      query = query.eq("event_node_id", targetNodeId);
    }

    if (filter?.associateId) {
      query = query.eq("associate_id", filter.associateId);
    }

    if (filter?.isActive !== undefined) {
      query = query.eq("is_active", filter.isActive);
    } else if (filter?.status) {
      if (filter.status === "active") {
        query = query.eq("is_active", true);
      } else if (
        filter.status === "suspended" ||
        filter.status === "completed"
      ) {
        query = query.eq("is_active", false);
      }
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(
        `Failed to fetch allocations from Supabase: ${error.message}`
      );
    }

    let records: AssociateAllocation[] = (
      (data as AssociateAllocationRow[]) || []
    ).map((row) => mapRowToAllocation(row));

    if (filter?.search && filter.search.trim() !== "") {
      const q = filter.search.toLowerCase().trim();
      records = records.filter(
        (r) =>
          r.associateId.toLowerCase().includes(q) ||
          r.eventId.toLowerCase().includes(q) ||
          (r.eventNodeId && r.eventNodeId.toLowerCase().includes(q)) ||
          (r.subEventId && r.subEventId.toLowerCase().includes(q)) ||
          (r.associateName && r.associateName.toLowerCase().includes(q)) ||
          (r.eventName && r.eventName.toLowerCase().includes(q)) ||
          (r.associateDepartment &&
            r.associateDepartment.toLowerCase().includes(q))
      );
    }

    return records;
  }

  /**
   * Retrieve a single allocation by ID from Supabase.
   *
   * @param id - Unique allocation UUID
   * @returns The matching AssociateAllocation or null
   */
  async getAllocationById(
    id: string
  ): Promise<AssociateAllocation | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("associate_allocations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Failed to fetch allocation '${id}' from Supabase: ${error.message}`
      );
    }

    if (!data) return null;

    return mapRowToAllocation(data as AssociateAllocationRow);
  }

  /**
   * Create a new Associate Allocation in Supabase.
   *
   * Validates associate eligibility and event status, captures authenticated user ID,
   * maps fields to snake_case database columns, and enforces unique constraint.
   *
   * @param input - CreateAllocationInput
   * @param associate - Associate reference for eligibility check
   * @param event - Event reference for event status/sub-event check
   * @returns The created AssociateAllocation record
   */
  async createAllocation(
    input: CreateAllocationInput,
    associate?: AssociateReference,
    event?: EventReference
  ): Promise<AssociateAllocation> {
    // 1. Domain validation
    const validation =
      associate && event
        ? validateCompleteAllocation(input, associate, event)
        : validateCreateAllocationInput(input);

    if (!validation.isValid) {
      throw new Error(validation.errors.join(" "));
    }

    const supabase = createClient();

    // Map fields: eventId/eventNodeId -> event_node_id
    const targetEventNodeId =
      input.eventNodeId || input.subEventId || input.eventId;
    if (!targetEventNodeId) {
      throw new Error("Event ID or Event Node ID is required.");
    }

    // Map status: is_active boolean
    const isActive =
      input.isActive !== undefined
        ? input.isActive
        : input.status
        ? input.status === "active" || input.status === "scheduled"
        : true;

    // Respect authenticated user session for assigned_by
    const assignedBy = await this.getAuthenticatedUserId();

    const payload: AssociateAllocationInsert = {
      associate_id: input.associateId,
      event_node_id: targetEventNodeId,
      attendance_access: Boolean(input.attendanceAccess),
      is_active: isActive,
      assigned_by: assignedBy,
    };

    const { data, error } = await supabase
      .from("associate_allocations")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      // Handle unique constraint (associate_id, event_node_id)
      if (
        error.code === "23505" ||
        error.message.includes("associate_event_allocation_unique") ||
        error.message.includes("unique")
      ) {
        throw new Error(
          "This associate is already allocated to this event or sub-event."
        );
      }

      throw new Error(
        `Failed to create allocation in Supabase: ${error.message}`
      );
    }

    const subEvent = event?.subEvents?.find(
      (s) => s.id === input.subEventId
    );

    return mapRowToAllocation(data as AssociateAllocationRow, {
      associateName: associate?.name,
      associateEmail: associate?.email,
      associateDepartment: associate?.department,
      eventName: event?.name,
      subEventId: input.subEventId,
      subEventName: subEvent?.name,
    });
  }

  /**
   * Update an existing allocation in Supabase.
   *
   * @param id - Allocation UUID to update
   * @param input - UpdateAllocationInput (attendanceAccess, status, isActive)
   * @returns Updated AssociateAllocation
   */
  async updateAllocation(
    id: string,
    input: UpdateAllocationInput
  ): Promise<AssociateAllocation> {
    const validation = validateUpdateAllocationInput(input);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(" "));
    }

    const supabase = createClient();

    const updates: AssociateAllocationUpdate = {};

    if (input.attendanceAccess !== undefined) {
      updates.attendance_access = input.attendanceAccess;
    }

    if (input.isActive !== undefined) {
      updates.is_active = input.isActive;
    } else if (input.status !== undefined) {
      updates.is_active =
        input.status === "active" || input.status === "scheduled";
    }

    const { data, error } = await supabase
      .from("associate_allocations")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(
        `Failed to update allocation '${id}' in Supabase: ${error.message}`
      );
    }

    if (!data) {
      throw new Error(`Allocation with ID '${id}' was not found in Supabase.`);
    }

    return mapRowToAllocation(data as AssociateAllocationRow);
  }

  /**
   * Delete an allocation record from Supabase.
   *
   * @param id - Allocation UUID to delete
   * @returns true if deleted
   */
  async deleteAllocation(id: string): Promise<boolean> {
    const supabase = createClient();

    const { error } = await supabase
      .from("associate_allocations")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(
        `Failed to delete allocation '${id}' from Supabase: ${error.message}`
      );
    }

    return true;
  }

  /**
   * Contract Method for Associate Dashboard:
   * Returns active allocations assigned to a specific associate.
   *
   * @param associateId - UUID of the associate
   * @returns Allocations assigned to the associate
   */
  async getAssociateAllocations(
    associateId: string
  ): Promise<AssociateAllocation[]> {
    return this.getAllocations({ associateId, isActive: true });
  }

  /**
   * Contract Method for Attendance Module:
   * Checks whether an associate has active Attendance Access for a given event node.
   * Leverages the idx_associate_allocations_event_active index for optimal performance.
   *
   * @param associateId - UUID of the associate
   * @param eventId - UUID of the event or event_node
   * @returns boolean true if allocated, active, and attendance_access is true
   */
  async checkAttendanceAccess(
    associateId: string,
    eventId: string
  ): Promise<boolean> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("associate_allocations")
      .select("attendance_access, is_active")
      .eq("associate_id", associateId)
      .eq("event_node_id", eventId)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    return Boolean(data.attendance_access);
  }
}

// Export singleton instance
export const allocationService = new AssociateAllocationService();
