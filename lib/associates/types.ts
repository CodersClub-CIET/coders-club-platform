import type { AssociateReference } from "@/lib/allocation/types";

/**
 * Exact database representation of a row in public.associates.
 * Matches current live PostgreSQL schema strictly:
 * id uuid, auth_user_id uuid, name text, email text, phone text,
 * is_active boolean, created_at timestamptz, updated_at timestamptz.
 */
export interface AssociateRow {
  id: string;
  auth_user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Domain representation of an Associate in Associate Management.
 */
export interface Associate {
  id: string;
  authUserId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input payload for Admin creating a new associate.
 */
export interface CreateAssociateInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  isActive?: boolean;
}

/**
 * Input payload for Admin updating an existing associate.
 */
export interface UpdateAssociateInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  isActive?: boolean;
}

/**
 * Filter parameters for querying associates in admin views.
 */
export interface AssociateFilter {
  search?: string;
  isActive?: boolean | "all";
}

/**
 * Converts a database AssociateRow into a domain Associate.
 */
export function toDomainAssociate(row: AssociateRow): Associate {
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

/**
 * Maps a database AssociateRow or domain Associate to the AssociateReference
 * contract expected by the Associate Allocation module.
 *
 * ============================================================================
 * COMPATIBILITY NOTICE & ARCHITECTURE CONTRACT
 * ============================================================================
 * - `is_active` and approval are conceptually different business states.
 * - The current `public.associates` database schema does not persist a separate
 *   approval state column (no `is_approved` or `approval_status`).
 * - `isApproved` temporarily maps from `is_active` ONLY as a compatibility bridge
 *   for the existing allocation contract (validateAssociateEligibility in lib/allocation).
 * - This mapping is temporary and must be replaced if Backend/Security later
 *   introduces an authoritative approval field or table contract.
 * - We do NOT claim that `is_active` is the true approval state.
 * - `department` falls back to "General" to maintain compatibility with
 *   lib/allocation/service.ts (line 252 fallback).
 * ============================================================================
 */
export function toAssociateReference(
  source: AssociateRow | Associate
): AssociateReference {
  const isActive = "is_active" in source ? source.is_active : source.isActive;
  return {
    id: source.id,
    name: source.name,
    email: source.email ?? "",
    department: "General",
    isActive,
    isApproved: isActive, // Temporary compatibility bridge
  };
}
