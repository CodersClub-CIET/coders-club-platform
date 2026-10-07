import { createClient } from "@/lib/supabase/client";
import type { AssociateReference } from "@/lib/allocation/types";
import {
  Associate,
  AssociateFilter,
  AssociateRow,
  CreateAssociateInput,
  toAssociateReference,
  toDomainAssociate,
  UpdateAssociateInput,
} from "./types";
import {
  validateCreateAssociateInput,
  validateUpdateAssociateInput,
} from "./validation";

export class AssociateServiceError extends Error {
  code?: string;
  statusCode: number;

  constructor(message: string, statusCode = 400, code?: string) {
    super(message);
    this.name = "AssociateServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

interface PostgrestErrorLike {
  code?: string;
  message: string;
  details?: string;
}

function handlePostgrestError(error: PostgrestErrorLike, operation: string): never {
  if (error.code === "42501") {
    throw new AssociateServiceError(
      `Permission denied: Only administrators can ${operation} associates.`,
      403,
      "FORBIDDEN"
    );
  }

  if (error.code === "23505") {
    throw new AssociateServiceError(
      "A record with this unique identifier or authentication link already exists.",
      409,
      "DUPLICATE_KEY"
    );
  }

  throw new AssociateServiceError(
    error.message || `Failed to ${operation} associate record.`,
    500,
    error.code
  );
}

class AssociateManagementService {
  /**
   * Retrieves all associate records from public.associates, optionally filtered.
   * Authenticated users can read associates under RLS Policy 3.
   */
  async listAssociates(filter?: AssociateFilter): Promise<Associate[]> {
    const supabase = createClient();

    let query = supabase
      .from("associates")
      .select("id, auth_user_id, name, email, phone, is_active, created_at, updated_at")
      .order("name", { ascending: true });

    if (filter?.isActive !== undefined && filter.isActive !== "all") {
      query = query.eq("is_active", filter.isActive);
    }

    const { data, error } = await query;

    if (error) {
      handlePostgrestError(error, "retrieve");
    }

    const rows = (data ?? []) as AssociateRow[];
    let associates = rows.map(toDomainAssociate);

    if (filter?.search && filter.search.trim() !== "") {
      const q = filter.search.toLowerCase().trim();
      associates = associates.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.email && a.email.toLowerCase().includes(q)) ||
          (a.phone && a.phone.includes(q))
      );
    }

    return associates;
  }

  /**
   * Retrieves a single associate record by ID.
   */
  async getAssociateById(id: string): Promise<Associate | null> {
    if (!id || typeof id !== "string") {
      throw new AssociateServiceError("Valid associate ID is required.", 400);
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("associates")
      .select("id, auth_user_id, name, email, phone, is_active, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      handlePostgrestError(error, "retrieve");
    }

    if (!data) return null;
    return toDomainAssociate(data as AssociateRow);
  }

  /**
   * Creates a new associate record in public.associates.
   * Strictly enforced by RLS: only users satisfying is_admin() can INSERT.
   */
  async createAssociate(input: CreateAssociateInput): Promise<Associate> {
    const validation = validateCreateAssociateInput(input);
    if (!validation.isValid) {
      throw new AssociateServiceError(validation.errors.join(" "), 422);
    }

    const supabase = createClient();
    const payload = {
      name: input.name.trim(),
      email: input.email && input.email.trim() !== "" ? input.email.trim() : null,
      phone: input.phone && input.phone.trim() !== "" ? input.phone.trim() : null,
      is_active: input.isActive ?? true,
    };

    const { data, error } = await supabase
      .from("associates")
      .insert([payload])
      .select("id, auth_user_id, name, email, phone, is_active, created_at, updated_at")
      .single();

    if (error) {
      handlePostgrestError(error, "create");
    }

    return toDomainAssociate(data as AssociateRow);
  }

  /**
   * Updates an existing associate record.
   * Strictly enforced by RLS: only users satisfying is_admin() can UPDATE.
   */
  async updateAssociate(
    id: string,
    input: UpdateAssociateInput
  ): Promise<Associate> {
    if (!id || typeof id !== "string") {
      throw new AssociateServiceError("Valid associate ID is required.", 400);
    }

    const validation = validateUpdateAssociateInput(input);
    if (!validation.isValid) {
      throw new AssociateServiceError(validation.errors.join(" "), 422);
    }

    const supabase = createClient();
    const payload: Record<string, unknown> = {};

    if (input.name !== undefined) {
      payload.name = input.name.trim();
    }
    if (input.email !== undefined) {
      payload.email = input.email && input.email.trim() !== "" ? input.email.trim() : null;
    }
    if (input.phone !== undefined) {
      payload.phone = input.phone && input.phone.trim() !== "" ? input.phone.trim() : null;
    }
    if (input.isActive !== undefined) {
      payload.is_active = input.isActive;
    }

    const { data, error } = await supabase
      .from("associates")
      .update(payload)
      .eq("id", id)
      .select("id, auth_user_id, name, email, phone, is_active, created_at, updated_at")
      .single();

    if (error) {
      handlePostgrestError(error, "update");
    }

    return toDomainAssociate(data as AssociateRow);
  }

  /**
   * Convenience helper to toggle or set associate active/inactive state.
   */
  async setAssociateActiveStatus(
    id: string,
    isActive: boolean
  ): Promise<Associate> {
    return this.updateAssociate(id, { isActive });
  }

  /**
   * Cross-Module Integration Contract:
   * Returns active associates adapted to the AssociateReference format required
   * by the Associate Allocation module.
   */
  async getEligibleAssociateReferences(): Promise<AssociateReference[]> {
    const activeAssociates = await this.listAssociates({ isActive: true });
    return activeAssociates.map(toAssociateReference);
  }
}

export const associateService = new AssociateManagementService();
