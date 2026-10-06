import type {
  CreateEventInput,
  CreateSubEventInput,
  UpdateEventInput,
  UpdateSubEventInput,
} from "./types";

export interface ValidationResult {
  valid: boolean;
  message: string;
}

function validateCommonFields(
  name: string,
  date: string,
  time: string,
  venue: string
): string {
  if (!name.trim()) {
    return "Event name is required.";
  }

  if (!date) {
    return "Date is required.";
  }

  if (!time) {
    return "Time is required.";
  }

  if (!venue.trim()) {
    return "Venue is required.";
  }

  return "";
}

export function validateCreateEventInput(
  input: CreateEventInput
): ValidationResult {
  const message = validateCommonFields(
    input.name,
    input.date,
    input.time,
    input.venue
  );

  return {
    valid: message === "",
    message,
  };
}

export function validateUpdateEventInput(
  input: UpdateEventInput
): ValidationResult {
  if (input.name !== undefined && !input.name.trim()) {
    return {
      valid: false,
      message: "Event name cannot be empty.",
    };
  }

  if (input.date !== undefined && !input.date) {
    return {
      valid: false,
      message: "Date cannot be empty.",
    };
  }

  if (input.time !== undefined && !input.time) {
    return {
      valid: false,
      message: "Time cannot be empty.",
    };
  }

  if (input.venue !== undefined && !input.venue.trim()) {
    return {
      valid: false,
      message: "Venue cannot be empty.",
    };
  }

  return {
    valid: true,
    message: "",
  };
}

export function validateCreateSubEventInput(
  input: CreateSubEventInput
): ValidationResult {
  const commonMessage = validateCommonFields(
    input.name,
    input.date,
    input.time,
    input.venue
  );

  if (commonMessage) {
    return {
      valid: false,
      message: commonMessage,
    };
  }

  if (!input.eventId.trim()) {
    return {
      valid: false,
      message: "Parent event ID is required.",
    };
  }

  return {
    valid: true,
    message: "",
  };
}

export function validateUpdateSubEventInput(
  input: UpdateSubEventInput
): ValidationResult {
  if (input.name !== undefined && !input.name.trim()) {
    return {
      valid: false,
      message: "Sub-event name cannot be empty.",
    };
  }

  if (input.date !== undefined && !input.date) {
    return {
      valid: false,
      message: "Date cannot be empty.",
    };
  }

  if (input.time !== undefined && !input.time) {
    return {
      valid: false,
      message: "Time cannot be empty.",
    };
  }

  if (input.venue !== undefined && !input.venue.trim()) {
    return {
      valid: false,
      message: "Venue cannot be empty.",
    };
  }

  return {
    valid: true,
    message: "",
  };
}