import type {
  CreateAssociateInput,
  UpdateAssociateInput,
} from "./types";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s-]{7,20}$/;

/**
 * Validates associate creation input.
 */
export function validateCreateAssociateInput(
  input: CreateAssociateInput
): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== "object") {
    return { isValid: false, errors: ["Input payload is required."] };
  }

  // Name validation
  if (!input.name || typeof input.name !== "string" || input.name.trim().length === 0) {
    errors.push("Associate name is required.");
  } else if (input.name.trim().length < 2) {
    errors.push("Associate name must be at least 2 characters long.");
  } else if (input.name.trim().length > 100) {
    errors.push("Associate name must not exceed 100 characters.");
  }

  // Email validation (optional but validated if provided)
  if (input.email !== undefined && input.email !== null && input.email.trim() !== "") {
    const trimmedEmail = input.email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.push("Please provide a valid email address.");
    }
  }

  // Phone validation (optional but validated if provided)
  if (input.phone !== undefined && input.phone !== null && input.phone.trim() !== "") {
    const trimmedPhone = input.phone.trim();
    if (!PHONE_REGEX.test(trimmedPhone)) {
      errors.push("Please provide a valid contact phone number.");
    }
  }

  // isActive validation
  if (input.isActive !== undefined && typeof input.isActive !== "boolean") {
    errors.push("Active status must be a boolean value.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates associate update input.
 */
export function validateUpdateAssociateInput(
  input: UpdateAssociateInput
): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== "object") {
    return { isValid: false, errors: ["Input payload is required."] };
  }

  if (
    input.name === undefined &&
    input.email === undefined &&
    input.phone === undefined &&
    input.isActive === undefined
  ) {
    errors.push("At least one field must be provided for update.");
  }

  // Name validation if provided
  if (input.name !== undefined) {
    if (typeof input.name !== "string" || input.name.trim().length === 0) {
      errors.push("Associate name cannot be empty.");
    } else if (input.name.trim().length < 2) {
      errors.push("Associate name must be at least 2 characters long.");
    } else if (input.name.trim().length > 100) {
      errors.push("Associate name must not exceed 100 characters.");
    }
  }

  // Email validation if provided
  if (input.email !== undefined && input.email !== null && input.email.trim() !== "") {
    const trimmedEmail = input.email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.push("Please provide a valid email address.");
    }
  }

  // Phone validation if provided
  if (input.phone !== undefined && input.phone !== null && input.phone.trim() !== "") {
    const trimmedPhone = input.phone.trim();
    if (!PHONE_REGEX.test(trimmedPhone)) {
      errors.push("Please provide a valid contact phone number.");
    }
  }

  // isActive validation if provided
  if (input.isActive !== undefined && typeof input.isActive !== "boolean") {
    errors.push("Active status must be a boolean value.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
