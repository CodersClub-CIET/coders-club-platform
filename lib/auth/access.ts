import type { AuthState, UserRole } from "./types";

export const MANAGEMENT_ROLES: readonly UserRole[] = ["admin", "associate"];
export const ALLOCATION_MANAGEMENT_ROLES: readonly UserRole[] = ["admin"];

/** UI entry only. Resource authorization must still be enforced by RLS/API. */
export function getManagementAccess(state: AuthState, allowedRoles = MANAGEMENT_ROLES) {
  if (state.loading) return "loading";
  if (state.error) return "error";
  if (!state.isAuthenticated || !state.user) return "sign-in";
  if (!state.isAuthorized || !state.role || !allowedRoles.includes(state.role)) return "denied";
  return "allowed";
}

export function canOperateQR(role: UserRole | null, target: "student" | "associate") {
  return target === "student" ? role === "associate" : role === "admin";
}
