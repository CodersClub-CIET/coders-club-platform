import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Pure functions under test (inlined / imported for Node.js test runner)
 */

function toAssociateReference(source) {
  const isActive = "is_active" in source ? source.is_active : source.isActive;
  return {
    id: source.id,
    name: source.name,
    email: source.email ?? "",
    department: "General",
    isActive,
    isApproved: isActive,
  };
}

function toDomainAssociate(row) {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s-]{7,20}$/;

function validateCreateAssociateInput(input) {
  const errors = [];
  if (!input || typeof input !== "object") {
    return { isValid: false, errors: ["Input payload is required."] };
  }
  if (!input.name || typeof input.name !== "string" || input.name.trim().length === 0) {
    errors.push("Associate name is required.");
  } else if (input.name.trim().length < 2) {
    errors.push("Associate name must be at least 2 characters long.");
  } else if (input.name.trim().length > 100) {
    errors.push("Associate name must not exceed 100 characters.");
  }

  if (input.email !== undefined && input.email !== null && input.email.trim() !== "") {
    if (!EMAIL_REGEX.test(input.email.trim())) {
      errors.push("Please provide a valid email address.");
    }
  }

  if (input.phone !== undefined && input.phone !== null && input.phone.trim() !== "") {
    if (!PHONE_REGEX.test(input.phone.trim())) {
      errors.push("Please provide a valid contact phone number.");
    }
  }

  if (input.isActive !== undefined && typeof input.isActive !== "boolean") {
    errors.push("Active status must be a boolean value.");
  }

  return { isValid: errors.length === 0, errors };
}

function validateAssociateEligibility(associate) {
  const errors = [];
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
  return { isValid: errors.length === 0, errors };
}

describe("Associate Management - Mapping & Contract Adapter Tests", () => {
  it("1. Maps active database row correctly to domain Associate", () => {
    const dbRow = {
      id: "a1b2c3d4-0000-0000-0000-000000000001",
      auth_user_id: "usr-123",
      name: "Saheena Developer",
      email: "saheena@codersclub.edu",
      phone: "+91 9876543210",
      is_active: true,
      created_at: "2026-10-07T10:00:00Z",
      updated_at: "2026-10-07T10:00:00Z",
    };

    const domain = toDomainAssociate(dbRow);
    assert.equal(domain.id, dbRow.id);
    assert.equal(domain.authUserId, "usr-123");
    assert.equal(domain.name, "Saheena Developer");
    assert.equal(domain.email, "saheena@codersclub.edu");
    assert.equal(domain.phone, "+91 9876543210");
    assert.equal(domain.isActive, true);
    assert.equal(domain.createdAt, "2026-10-07T10:00:00Z");
    assert.equal(domain.updatedAt, "2026-10-07T10:00:00Z");

    // Verify no nonexistent columns are accessed or expected
    assert.equal("is_approved" in domain, false);
    assert.equal("approval_status" in domain, false);
  });

  it("2. Active associate maps to isActive = true and isApproved = true in AssociateReference", () => {
    const activeRow = {
      id: "assoc-1",
      auth_user_id: null,
      name: "Arun Kumar",
      email: "arun@codersclub.edu",
      phone: null,
      is_active: true,
      created_at: "2026-10-07T10:00:00Z",
      updated_at: "2026-10-07T10:00:00Z",
    };

    const ref = toAssociateReference(activeRow);
    assert.equal(ref.id, "assoc-1");
    assert.equal(ref.name, "Arun Kumar");
    assert.equal(ref.email, "arun@codersclub.edu");
    assert.equal(ref.department, "General");
    assert.equal(ref.isActive, true);
    assert.equal(ref.isApproved, true);

    // Verify inter-module validation passes for active associate
    const eligibility = validateAssociateEligibility(ref);
    assert.equal(eligibility.isValid, true);
    assert.equal(eligibility.errors.length, 0);
  });

  it("3. Inactive associate maps to isActive = false and isApproved = false in AssociateReference", () => {
    const inactiveRow = {
      id: "assoc-2",
      auth_user_id: null,
      name: "Pooja Ramesh",
      email: "pooja@codersclub.edu",
      phone: null,
      is_active: false,
      created_at: "2026-10-07T10:00:00Z",
      updated_at: "2026-10-07T10:00:00Z",
    };

    const ref = toAssociateReference(inactiveRow);
    assert.equal(ref.isActive, false);
    assert.equal(ref.isApproved, false);

    // Verify inter-module validation fails for inactive associate
    const eligibility = validateAssociateEligibility(ref);
    assert.equal(eligibility.isValid, false);
    assert.ok(
      eligibility.errors.includes(
        "Associate account is currently inactive and cannot be allocated."
      )
    );
  });

  it("4. Missing or null email safely defaults to empty string '' in AssociateReference", () => {
    const rowWithoutEmail = {
      id: "assoc-3",
      auth_user_id: null,
      name: "Karthik Raja",
      email: null,
      phone: "+91 9988776655",
      is_active: true,
      created_at: "2026-10-07T10:00:00Z",
      updated_at: "2026-10-07T10:00:00Z",
    };

    const ref = toAssociateReference(rowWithoutEmail);
    assert.equal(ref.email, "");
    assert.equal(typeof ref.email, "string");
  });

  it("5. Department compatibility fallback is always 'General'", () => {
    const row = {
      id: "assoc-4",
      auth_user_id: null,
      name: "Divya Bharathi",
      email: "divya@codersclub.edu",
      phone: null,
      is_active: true,
      created_at: "2026-10-07T10:00:00Z",
      updated_at: "2026-10-07T10:00:00Z",
    };

    const ref = toAssociateReference(row);
    assert.equal(ref.department, "General");
  });
});

describe("Associate Management - Input Validation Tests", () => {
  it("6. validateCreateAssociateInput: succeeds for valid required name", () => {
    const result = validateCreateAssociateInput({ name: "Vignesh S" });
    assert.equal(result.isValid, true);
    assert.equal(result.errors.length, 0);
  });

  it("7. validateCreateAssociateInput: rejects empty or blank name", () => {
    assert.equal(validateCreateAssociateInput({ name: "" }).isValid, false);
    assert.equal(validateCreateAssociateInput({ name: "   " }).isValid, false);
    assert.equal(validateCreateAssociateInput({}).isValid, false);
  });

  it("8. validateCreateAssociateInput: validates email format if provided", () => {
    const invalid = validateCreateAssociateInput({
      name: "Vignesh S",
      email: "not-an-email",
    });
    assert.equal(invalid.isValid, false);
    assert.ok(invalid.errors.some((e) => e.includes("valid email")));

    const valid = validateCreateAssociateInput({
      name: "Vignesh S",
      email: "vignesh@ciet.edu.in",
    });
    assert.equal(valid.isValid, true);
  });

  it("9. validateCreateAssociateInput: validates phone format if provided", () => {
    const invalid = validateCreateAssociateInput({
      name: "Vignesh S",
      phone: "123", // too short
    });
    assert.equal(invalid.isValid, false);
    assert.ok(invalid.errors.some((e) => e.includes("valid contact phone")));

    const valid = validateCreateAssociateInput({
      name: "Vignesh S",
      phone: "+91 9876543210",
    });
    assert.equal(valid.isValid, true);
  });
});
