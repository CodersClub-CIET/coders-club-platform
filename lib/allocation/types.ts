/**
 * Associate Allocation Module - Data Contracts & Types
 *
 * Defines the TypeScript interfaces and types for allocating approved
 * Associates to relevant Events and Sub-events, including attendance access control.
 * Connected to Supabase table: associate_allocations
 */

// 1. Allocation Status
export type AllocationStatus = "scheduled" | "active" | "completed" | "suspended";

// 2. Associate Reference Contract (Integration with Associate Management)
export interface AssociateReference {
  id: string;
  name: string;
  email: string;
  department: string;
  isApproved: boolean; // Must be true for allocation eligibility
  isActive: boolean;   // Must be true for allocation eligibility
}

// 3. Event & Sub-Event Reference Contracts (Integration with Event Management)
export type EventStatus = "upcoming" | "active" | "completed";

export interface SubEventReference {
  id: string;
  name: string;
  date?: string;
}

export interface EventReference {
  id: string;
  name: string;
  status: EventStatus;
  date: string;
  subEvents?: SubEventReference[];
}

// 4. Primary Associate Allocation Record Contract
export interface AssociateAllocation {
  id: string;
  associateId: string;
  eventNodeId?: string;
  associateName: string;
  associateEmail: string;
  associateDepartment: string;
  eventId: string;
  eventName: string;
  subEventId?: string;
  subEventName?: string;
  attendanceAccess: boolean; // true = ON (authorized for attendance/QR workflow), false = OFF (blocked)
  status: AllocationStatus;
  isActive?: boolean;
  allocatedBy: string; // Admin User ID who performed the allocation (assigned_by in DB)
  allocatedAt: string; // ISO 8601 timestamp (assigned_at in DB)
  updatedAt: string;   // ISO 8601 timestamp
}

// 5. Supabase Database Row Schema for Table: associate_allocations
export interface AssociateAllocationRow {
  id: string;
  associate_id: string;
  event_node_id: string;
  attendance_access: boolean;
  is_active: boolean;
  assigned_by: string | null;
  assigned_at: string;
}

// 6. Supabase Database Insert Payload for Table: associate_allocations
export interface AssociateAllocationInsert {
  id?: string;
  associate_id: string;
  event_node_id: string;
  attendance_access?: boolean;
  is_active?: boolean;
  assigned_by?: string | null;
  assigned_at?: string;
}

// 7. Supabase Database Update Payload for Table: associate_allocations
export interface AssociateAllocationUpdate {
  attendance_access?: boolean;
  is_active?: boolean;
  assigned_by?: string | null;
}

// 8. Input payload when an Admin creates a new allocation
export interface CreateAllocationInput {
  associateId: string;
  eventId?: string;
  eventNodeId?: string;
  subEventId?: string;
  attendanceAccess: boolean;
  status?: AllocationStatus;
  isActive?: boolean;
}

// 9. Input payload when an Admin updates an existing allocation
export interface UpdateAllocationInput {
  attendanceAccess?: boolean;
  status?: AllocationStatus;
  isActive?: boolean;
}

// 10. Filter parameters for querying or searching allocations
export interface AllocationFilter {
  eventId?: string;
  eventNodeId?: string;
  associateId?: string;
  status?: AllocationStatus;
  isActive?: boolean;
  search?: string;
}

// 11. Helper to map Supabase database row to domain AssociateAllocation
export function mapRowToAllocation(
  row: AssociateAllocationRow,
  metadata?: {
    associateName?: string;
    associateEmail?: string;
    associateDepartment?: string;
    eventName?: string;
    subEventId?: string;
    subEventName?: string;
  }
): AssociateAllocation {
  return {
    id: row.id,
    associateId: row.associate_id,
    eventNodeId: row.event_node_id,
    associateName: metadata?.associateName || row.associate_id,
    associateEmail: metadata?.associateEmail || "",
    associateDepartment: metadata?.associateDepartment || "",
    eventId: row.event_node_id,
    eventName: metadata?.eventName || row.event_node_id,
    subEventId: metadata?.subEventId,
    subEventName: metadata?.subEventName,
    attendanceAccess: row.attendance_access,
    isActive: row.is_active,
    status: row.is_active ? "active" : "suspended",
    allocatedBy: row.assigned_by ?? "",
    allocatedAt: row.assigned_at,
    updatedAt: row.assigned_at,
  };
}
