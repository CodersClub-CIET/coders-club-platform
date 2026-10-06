export type UserRole = "admin" | "associate";

export interface AuthUser {
  id: string;
  email: string;
  role?: UserRole;
  name?: string;
}
