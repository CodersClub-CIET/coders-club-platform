import { createClient } from "@/lib/supabase/client";
import type { AuthUser } from "./types";

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const role =
    (user.user_metadata?.role as AuthUser["role"]) ||
    (user.email?.includes("admin") ? "admin" : "associate");

  return {
    id: user.id,
    email: user.email ?? "",
    role,
    name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
  };
}

export async function signOut(): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
