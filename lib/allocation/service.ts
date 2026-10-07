import {
  AllocationFilter,
  AllocationStatus,
  AssociateAllocation,
  AssociateReference,
  CreateAllocationInput,
  EventReference,
  UpdateAllocationInput,
} from "./types";
import {
  validateCompleteAllocation,
  validateCreateAllocationInput,
  validateUpdateAllocationInput,
} from "./validation";

/**
 * ============================================================================
 * BACKEND INTEGRATION CONTRACT NOTICE
 * ============================================================================
 * The Django REST Framework endpoints for Associate Allocation are not yet
 * deployed in this repository.
 *
 * PROPOSED DJANGO API CONTRACT (TO BE CONFIRMED WITH BACKEND TEAM):
 * - GET    /api/allocations/               -> List allocations (supports query filters)
 * - GET    /api/allocations/<id>/          -> Retrieve single allocation
 * - POST   /api/allocations/               -> Create new allocation
 * - PATCH  /api/allocations/<id>/          -> Update allocation (attendanceAccess/status)
 * - DELETE /api/allocations/<id>/          -> Remove allocation
 *
 * When backend endpoints are live, use Foundation's `apiClient` from:
 *   import { apiClient } from "@/lib/api/client";
 *
 * Current implementation uses a safe local state adapter with persistent storage
 * fallback so the frontend and other modules can integrate and test immediately
 * without inventing unauthorized backend URLs.
 * ============================================================================
 */

const STORAGE_ALLOCATIONS_KEY = "coders_club_associate_allocations";

// Initial seed records for testing and standalone preview
const SEED_ALLOCATIONS: AssociateAllocation[] = [
  {
    id: "alloc-01",
    associateId: "assoc-101",
    associateName: "Kavya Murugan",
    associateEmail: "kavya.m@codersclub.edu",
    associateDepartment: "CSE",
    eventId: "evt-01",
    eventName: "Full Stack Web Development Hackathon",
    subEventId: "sub-01",
    subEventName: "Round 1: Rapid Prototyping",
    attendanceAccess: true, // Access ON
    status: "active",
    allocatedBy: "usr-admin-01",
    allocatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "alloc-02",
    associateId: "assoc-102",
    associateName: "Dinesh Raj",
    associateEmail: "dinesh.r@codersclub.edu",
    associateDepartment: "IT",
    eventId: "evt-02",
    eventName: "Algorithmic Problem Solving Workshop",
    attendanceAccess: false, // Access OFF
    status: "scheduled",
    allocatedBy: "usr-admin-01",
    allocatedAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "alloc-03",
    associateId: "assoc-103",
    associateName: "Priya Sundaram",
    associateEmail: "priya.s@codersclub.edu",
    associateDepartment: "AI&DS",
    eventId: "evt-01",
    eventName: "Full Stack Web Development Hackathon",
    subEventId: "sub-02",
    subEventName: "Round 2: API Integration & Defense",
    attendanceAccess: true, // Access ON
    status: "active",
    allocatedBy: "usr-admin-01",
    allocatedAt: new Date(Date.now() - 43200000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
  },
];

class AssociateAllocationService {
  private inMemoryAllocations: AssociateAllocation[] = [...SEED_ALLOCATIONS];

  /**
   * Helper to retrieve stored allocations safely across client/server boundaries.
   */
  private getStoredAllocations(): AssociateAllocation[] {
    if (typeof window === "undefined") {
      return [...this.inMemoryAllocations];
    }

    try {
      const raw = localStorage.getItem(STORAGE_ALLOCATIONS_KEY);
      if (!raw) {
        localStorage.setItem(
          STORAGE_ALLOCATIONS_KEY,
          JSON.stringify(SEED_ALLOCATIONS)
        );
        return [...SEED_ALLOCATIONS];
      }
      return JSON.parse(raw);
    } catch {
      return [...this.inMemoryAllocations];
    }
  }

  /**
   * Helper to persist allocations safely.
   */
  private saveAllocations(records: AssociateAllocation[]): void {
    this.inMemoryAllocations = records;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          STORAGE_ALLOCATIONS_KEY,
          JSON.stringify(records)
        );
      } catch {
        // Fallback to in-memory state
      }
    }
  }

  /**
   * List allocations with optional filtering by event, associate, status, or search query.
   *
   * @param filter - Optional filters
   * @returns Array of AssociateAllocation records
   */
  async getAllocations(
    filter?: AllocationFilter
  ): Promise<AssociateAllocation[]> {
    // TODO: [Backend Contract] When Django endpoint is ready:
    // return apiClient<AssociateAllocation[]>("/allocations/", { ... });

    let records = this.getStoredAllocations();

    if (!filter) return records;

    if (filter.eventId) {
      records = records.filter((r) => r.eventId === filter.eventId);
    }

    if (filter.associateId) {
      records = records.filter((r) => r.associateId === filter.associateId);
    }

    if (filter.status) {
      records = records.filter((r) => r.status === filter.status);
    }

    if (filter.search && filter.search.trim() !== "") {
      const q = filter.search.toLowerCase().trim();
      records = records.filter(
        (r) =>
          r.associateName.toLowerCase().includes(q) ||
          r.associateEmail.toLowerCase().includes(q) ||
          r.eventName.toLowerCase().includes(q) ||
          (r.subEventName && r.subEventName.toLowerCase().includes(q)) ||
          r.associateDepartment.toLowerCase().includes(q)
      );
    }

    return records;
  }

  /**
   * Retrieve a single allocation by ID.
   *
   * @param id - Unique allocation ID
   * @returns The matching AssociateAllocation or null
   */
  async getAllocationById(
    id: string
  ): Promise<AssociateAllocation | null> {
    // TODO: [Backend Contract] When Django endpoint is ready:
    // return apiClient<AssociateAllocation>(`/allocations/${id}/`);

    const records = this.getStoredAllocations();
    return records.find((r) => r.id === id) || null;
  }

  /**
   * Create a new Associate Allocation.
   * Runs complete validation (input + associate eligibility + event eligibility).
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
    // 1. Validation check
    const validation = associate && event
      ? validateCompleteAllocation(input, associate, event)
      : validateCreateAllocationInput(input);

    if (!validation.isValid) {
      throw new Error(validation.errors.join(" "));
    }

    // TODO: [Backend Contract] When Django endpoint is ready:
    // return apiClient<AssociateAllocation>("/allocations/", {
    //   method: "POST",
    //   body: JSON.stringify(input),
    // });

    const records = this.getStoredAllocations();

    // Check for duplicate allocation (same associate on exact same event or sub-event)
    const targetSubEventId = input.subEventId || undefined;
    const duplicate = records.find(
      (r) =>
        r.associateId === input.associateId &&
        r.eventId === input.eventId &&
        (r.subEventId || undefined) === targetSubEventId &&
        r.status !== "completed"
    );

    if (duplicate) {
      throw new Error(
        `Associate is already allocated to this event context with status '${duplicate.status}'.`
      );
    }

    const subEvent = event?.subEvents?.find((s) => s.id === input.subEventId);

    // Sensible default status: "scheduled" if event is upcoming, otherwise "active"
    const resolvedStatus: AllocationStatus =
      input.status || (event?.status === "upcoming" ? "scheduled" : "active");

    const now = new Date().toISOString();
    const newRecord: AssociateAllocation = {
      id: `alloc-${Date.now().toString(36)}`,
      associateId: input.associateId,
      associateName: associate?.name || "Associate",
      associateEmail: associate?.email || "",
      associateDepartment: associate?.department || "General",
      eventId: input.eventId,
      eventName: event?.name || "Event",
      subEventId: input.subEventId,
      subEventName: subEvent?.name,
      attendanceAccess: Boolean(input.attendanceAccess),
      status: resolvedStatus,
      allocatedBy: "admin", // Authoritative user id from session
      allocatedAt: now,
      updatedAt: now,
    };

    const updated = [newRecord, ...records];
    this.saveAllocations(updated);

    return newRecord;
  }

  /**
   * Update an existing allocation (e.g. toggle attendanceAccess or change status).
   *
   * @param id - Allocation ID to update
   * @param input - UpdateAllocationInput (attendanceAccess, status)
   * @returns Updated AssociateAllocation
   */
  async updateAllocation(
    id: string,
    input: UpdateAllocationInput
  ): Promise<AssociateAllocation> {
    // 1. Validation check
    const validation = validateUpdateAllocationInput(input);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(" "));
    }

    // TODO: [Backend Contract] When Django endpoint is ready:
    // return apiClient<AssociateAllocation>(`/allocations/${id}/`, {
    //   method: "PATCH",
    //   body: JSON.stringify(input),
    // });

    const records = this.getStoredAllocations();
    const index = records.findIndex((r) => r.id === id);

    if (index === -1) {
      throw new Error(`Allocation with ID '${id}' was not found.`);
    }

    const existing = records[index];
    const updatedRecord: AssociateAllocation = {
      ...existing,
      ...(input.attendanceAccess !== undefined && {
        attendanceAccess: input.attendanceAccess,
      }),
      ...(input.status !== undefined && { status: input.status }),
      updatedAt: new Date().toISOString(),
    };

    records[index] = updatedRecord;
    this.saveAllocations(records);

    return updatedRecord;
  }

  /**
   * Delete an allocation record.
   *
   * @param id - Allocation ID to delete
   * @returns true if deleted
   */
  async deleteAllocation(id: string): Promise<boolean> {
    // TODO: [Backend Contract] When Django endpoint is ready:
    // await apiClient<void>(`/allocations/${id}/`, { method: "DELETE" });
    // return true;

    const records = this.getStoredAllocations();
    const filtered = records.filter((r) => r.id !== id);

    if (filtered.length === records.length) {
      throw new Error(`Allocation with ID '${id}' was not found.`);
    }

    this.saveAllocations(filtered);
    return true;
  }

  /**
   * Contract Method for Associate Dashboard:
   * Returns allocations assigned to a specific associate.
   *
   * @param associateId - User ID of the associate
   * @returns Allocations assigned to the associate
   */
  async getAssociateAllocations(
    associateId: string
  ): Promise<AssociateAllocation[]> {
    return this.getAllocations({ associateId });
  }

  /**
   * Contract Method for Attendance Module:
   * Checks whether an associate has active Attendance Access for a given event.
   *
   * @param associateId - User ID of the associate
   * @param eventId - ID of the event
   * @returns boolean true if allocated and attendanceAccess is ON
   */
  async checkAttendanceAccess(
    associateId: string,
    eventId: string
  ): Promise<boolean> {
    const allocations = await this.getAllocations({
      associateId,
      eventId,
    });

    const activeAllocation = allocations.find(
      (a) => a.status === "active" && a.attendanceAccess === true
    );

    return Boolean(activeAllocation);
  }
}

// Export singleton instance
export const allocationService = new AssociateAllocationService();
