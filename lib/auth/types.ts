import type { User } from "@supabase/supabase-js";

export type UserRole = "admin" | "associate";
export type AuthorizationStatus =
  | "loading"
  | "signed-out"
  | "authorized"
  | "missing-profile"
  | "inactive-profile"
  | "unsupported-role"
  | "profile-error"
  | "session-error"
  | "configuration-error";

export interface AuthProfile {
  id: string;
  role: UserRole | null;
  isActive: boolean;
  displayName: string | null;
  email: string | null;
}

export interface AuthState {
  user: User | null;
  profile: AuthProfile | null;
  role: UserRole | null;
  status: AuthorizationStatus;
  loading: boolean;
  isAuthenticated: boolean;
  isAuthorized: boolean;
  error: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  role?: UserRole;
  name?: string;
  authorizationStatus: AuthorizationStatus;
  isAuthorized: boolean;
}
