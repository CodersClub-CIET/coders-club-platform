import { createClient } from "../supabase/client";
import { createAuthStore, resolveAuthState } from "./session";
import type { AuthSource } from "./session";
import type { AuthUser } from "./types";

export function createAuthSource(): AuthSource {
  const supabase = createClient();
  return {
    async getUser() {
      const { data: { user }, error } = await supabase.auth.getUser();
      return { user, error };
    },
    async getProfile(id) {
      const { data, error } = await supabase.from("user_profiles")
        .select("id, role, is_active, display_name, email").eq("id", id).maybeSingle();
      return { profile: data, error: !!error };
    },
    onChange(callback) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        callback(session?.user ?? null, event);
      });
      return () => subscription.unsubscribe();
    },
  };
}

// Client creation is lazy, so missing env does not crash public-route imports.
export const authStore = createAuthStore(createAuthSource);

export async function getCurrentUser(): Promise<AuthUser | null> {
  const state = await resolveAuthState(createAuthSource());
  if (!state.user) return null;
  const metadataName: unknown = state.user.user_metadata?.name;
  return {
    id: state.user.id,
    email: state.user.email ?? state.profile?.email ?? "",
    role: state.role ?? undefined,
    name: state.profile?.displayName || (typeof metadataName === "string" ? metadataName : undefined) || "User",
    authorizationStatus: state.status,
    isAuthorized: state.isAuthorized,
  };
}

export async function signOut(): Promise<void> {
  const { error } = await createClient().auth.signOut();
  if (error) throw error;
  // Re-verify/reset even when no mounted subscriber received the auth event.
  await authStore.refresh();
}
