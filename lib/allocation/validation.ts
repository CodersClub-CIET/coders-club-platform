import {
  AllocationStatus,
  AssociateReference,
  CreateAllocationInput,
  EventReference,
  UpdateAllocationInput,
} from "./types";

/**
 * Standard validation result interface returned by all allocation validation functions.
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Supported allocation statuses according to module specifications.
 */
export const VALID_ALLOCATION_STATUSES: readonly AllocationStatus[] = [
  "scheduled",
  "active",
  "completed",
  "suspended",
] as const;

/**
 * Checks if an Associate is eligible to be allocated to an event.
 *
 * Rules:
 * 1. Associate must exist.
 * 2. Associate must be active (isActive === true).
 * 3. Associate must be approved (isApproved === true).
 *
 * @param associate - The associate reference to check
 * @returns ValidationResult with validity flag and specific error messages
 */
export function validateAssociateEligibility(
  associate?: AssociateReference | null
): ValidationResult {
  const errors: string[] = [];

  if (!associate) {
    errors.push("Associate reference is required.");
    return { isValid: false, errors };
  }

  if (typeof associate.isActive !== "boolean" || !associate.isActive) {
    errors.push("Associate account is currently inactive and cannot be allocated.");
  }

  if (typeof associate.isApproved !== "boolean" || !associate.isApproved) {
    errors.push("Only approved associates can be allocated to events.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Checks if an Event (and optional Sub-event) is eligible for associate allocation.
 *
 * Rules:
 * 1. Event must exist.
 * 2. Event status must be supported ("upcoming" or "active").
 * 3. If a subEventId is provided, it must belong to the specified event.
 *
 * @param event - The event reference to check
 * @param subEventId - Optional sub-event ID to verify
 * @returns ValidationResult with validity flag and specific error messages
 */
export function validateEventEligibility(
  event?: EventReference | null,
  subEventId?: string
): ValidationResult {
  const errors: string[] = [];

  if (!event) {
    errors.push("Event reference is required.");
    return { isValid: false, errors };
  }

  // Only "upcoming" or "active" events are supported for allocation
  if (event.status === "completed") {
    errors.push("Completed events cannot receive new associate allocations.");
  } else if (event.status !== "upcoming" && event.status !== "active") {
    errors.push(`Event status '${event.status}' is not supported for allocation.`);
  }

  // If subEventId is specified, check that it exists within event.subEvents
  if (subEventId && subEventId.trim() !== "") {
    if (!event.subEvents || event.subEvents.length === 0) {
      errors.push(`Event '${event.name}' has no sub-events registered.`);
    } else {
      const match = event.subEvents.some((sub) => sub.id === subEventId);
      if (!match) {
        errors.push(`Sub-event ID '${subEventId}' does not belong to event '${event.name}'.`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates the input payload when an Admin creates a new allocation.
 *
 * Rules:
 * 1. Payload must be a non-null object.
 * 2. associateId is required and must not be empty.
 * 3. eventId is required and must not be empty.
 * 4. attendanceAccess must be a strict boolean.
 * 5. status, if provided, must be a recognized AllocationStatus.
 *
 * @param input - The CreateAllocationInput payload to validate
 * @returns ValidationResult with validity flag and specific error messages
 */
export function validateCreateAllocationInput(
  input: CreateAllocationInput
): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== "object") {
    errors.push("Allocation input payload must be an object.");
    return { isValid: false, errors };
  }

  if (!input.associateId || typeof input.associateId !== "string" || input.associateId.trim() === "") {
    errors.push("Associate ID is required.");
  }

  if (!input.eventId || typeof input.eventId !== "string" || input.eventId.trim() === "") {
    errors.push("Event ID is required.");
  }

  if (typeof input.attendanceAccess !== "boolean") {
    errors.push("Attendance Access must be explicitly set to ON (true) or OFF (false).");
  }

  if (input.status !== undefined && !VALID_ALLOCATION_STATUSES.includes(input.status)) {
    errors.push(
      `Invalid allocation status '${input.status}'. Allowed values are: ${VALID_ALLOCATION_STATUSES.join(", ")}.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates the input payload when an Admin updates an existing allocation.
 *
 * Rules:
 * 1. Payload must be a non-null object.
 * 2. At least one field (attendanceAccess or status) must be provided.
 * 3. If attendanceAccess is provided, it must be a strict boolean.
 * 4. If status is provided, it must be a recognized AllocationStatus.
 *
 * @param input - The UpdateAllocationInput payload to validate
 * @returns ValidationResult with validity flag and specific error messages
 */
export function validateUpdateAllocationInput(
  input: UpdateAllocationInput
): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== "object") {
    errors.push("Update input payload must be an object.");
    return { isValid: false, errors };
  }

  const hasAttendanceAccess = input.attendanceAccess !== undefined;
  const hasStatus = input.status !== undefined;

  if (!hasAttendanceAccess && !hasStatus) {
    errors.push("Update payload must specify at least one field to change (attendanceAccess or status).");
  }

  if (hasAttendanceAccess && typeof input.attendanceAccess !== "boolean") {
    errors.push("Attendance Access must be a valid boolean (true or false).");
  }

  if (hasStatus && input.status !== undefined && !VALID_ALLOCATION_STATUSES.includes(input.status)) {
    errors.push(
      `Invalid allocation status '${input.status}'. Allowed values are: ${VALID_ALLOCATION_STATUSES.join(", ")}.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Composite validator that runs input, associate eligibility, and event eligibility
 * validations in one call.
 *
 * @param input - Allocation input payload
 * @param associate - Associate reference
 * @param event - Event reference
 * @returns Combined ValidationResult with all accumulated errors
 */
export function validateCompleteAllocation(
  input: CreateAllocationInput,
  associate?: AssociateReference | null,
  event?: EventReference | null
): ValidationResult {
  const inputValidation = validateCreateAllocationInput(input);
  const associateValidation = validateAssociateEligibility(associate);
  const eventValidation = validateEventEligibility(event, input.subEventId);

  const errors: string[] = [
    ...inputValidation.errors,
    ...associateValidation.errors,
    ...eventValidation.errors,
  ];

  return {
    isValid: errors.length === 0,
    errors,
  };
}
