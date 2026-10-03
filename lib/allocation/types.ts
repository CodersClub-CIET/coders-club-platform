/**
 * Associate Allocation Module - Data Contracts & Types
 *
 * Defines the TypeScript interfaces and types for allocating approved
 * Associates to relevant Events and Sub-events, including attendance access control.
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
  associateName: string;
  associateEmail: string;
  associateDepartment: string;
  eventId: string;
  eventName: string;
  subEventId?: string;
  subEventName?: string;
  attendanceAccess: boolean; // true = ON (authorized for attendance/QR workflow), false = OFF (blocked)
  status: AllocationStatus;
  allocatedBy: string; // Admin User ID who performed the allocation
  allocatedAt: string; // ISO 8601 timestamp
  updatedAt: string;   // ISO 8601 timestamp
}

// 5. Input payload when an Admin creates a new allocation
export interface CreateAllocationInput {
  associateId: string;
  eventId: string;
  subEventId?: string;
  attendanceAccess: boolean;
  status?: AllocationStatus;
}

// 6. Input payload when an Admin updates an existing allocation
export interface UpdateAllocationInput {
  attendanceAccess?: boolean;
  status?: AllocationStatus;
}

// 7. Filter parameters for querying or searching allocations
export interface AllocationFilter {
  eventId?: string;
  associateId?: string;
  status?: AllocationStatus;
  search?: string;
}
