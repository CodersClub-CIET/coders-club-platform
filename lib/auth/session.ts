import type { User } from "@supabase/supabase-js";
import type { AuthProfile, AuthState } from "./types";

/** Injectable auth boundary for focused tests, backed by the existing client in production. */
export interface AuthSource {
  getUser(): Promise<{ user: User | null; error: { name: string } | null }>;
  getProfile(id: string): Promise<{ profile: unknown; error: boolean }>;
  onChange(callback: (user: User | null, event?: string) => void): () => void;
}

export const INITIAL_AUTH_STATE: AuthState = {
  user: null, profile: null, role: null, status: "loading", loading: true,
  isAuthenticated: false, isAuthorized: false, error: null,
};
const signedOut = (): AuthState => ({ ...INITIAL_AUTH_STATE, loading: false, status: "signed-out" });

function parseProfile(value: unknown, id: string): AuthProfile | null {
  if (!value || typeof value !== "object" || !("id" in value) || value.id !== id || !("role" in value) || !("is_active" in value) || typeof value.is_active !== "boolean") return null;
  return {
    id,
    role: value.role === "admin" || value.role === "associate" ? value.role : null,
    isActive: value.is_active,
    displayName: "display_name" in value && typeof value.display_name === "string" ? value.display_name : null,
    email: "email" in value && typeof value.email === "string" ? value.email : null,
  };
}

export async function resolveAuthState(source: AuthSource): Promise<AuthState> {
  const { user, error } = await source.getUser();
  if (error && error.name !== "AuthSessionMissingError") {
    return { ...signedOut(), status: "session-error", error: "Unable to verify your session. Please try again." };
  }
  if (error || !user) return signedOut();
  const identity: AuthState = { ...signedOut(), user, isAuthenticated: true, status: "missing-profile" };
  try {
    const result = await source.getProfile(user.id);
    if (result.error) throw new Error("Profile lookup failed");
    if (result.profile === null) return identity;
    const profile = parseProfile(result.profile, user.id);
    if (!profile) return { ...identity, status: "profile-error", error: "Unable to verify your application profile." };
    if (!profile.isActive) return { ...identity, profile, status: "inactive-profile" };
    if (!profile.role) return { ...identity, profile, status: "unsupported-role" };
    return { ...identity, profile, role: profile.role, status: "authorized", isAuthorized: true };
  } catch {
    return { ...identity, status: "profile-error", error: "Unable to verify your application profile. Please try again." };
  }
}

/** Shared hook subscription with cancellation; no resource data or role in browser storage. */
export function createAuthStore(sourceFactory: () => AuthSource) {
  let state = INITIAL_AUTH_STATE;
  const listeners = new Set<() => void>();
  let unsubscribe: (() => void) | null = null;
  let source: AuthSource | null = null;
  let revision = 0;
  let generation = 0;
  const publish = (next: AuthState) => { state = next; listeners.forEach((listener) => listener()); };

  const connect = (): AuthSource => {
    if (source) return source;
    const connection = ++generation;
    const next = sourceFactory();
    const cleanup = next.onChange((user, authEvent) => {
      if (!listeners.size || connection !== generation) return;
      const event = ++revision;
      // Revalidation of the same verified account must not destroy live UI state.
      // Its previous profile is revalidated; failures revoke access, not elevate it.
      const background = ["TOKEN_REFRESHED", "SIGNED_IN", "USER_UPDATED", "INITIAL_SESSION"].includes(authEvent ?? "") && state.isAuthorized && state.user?.id === user?.id;
      if (!background) publish(user ? INITIAL_AUTH_STATE : signedOut());
      // Supabase queries must run outside its synchronous auth callback.
      if (user) queueMicrotask(() => {
        if (listeners.size && event === revision && connection === generation) void refresh(background);
      });
    });
    source = next;
    unsubscribe = cleanup;
    return next;
  };

  const refresh = async (background = false) => {
    if (!listeners.size) {
      ++revision;
      state = INITIAL_AUTH_STATE;
      return;
    }
    const request = ++revision;
    if (!background) publish(INITIAL_AUTH_STATE);
    try {
      const next = await resolveAuthState(connect());
      if (listeners.size && request === revision) publish(next);
    } catch (error: unknown) {
      if (listeners.size && request === revision) {
        const configuration = error instanceof Error && error.name === "SupabaseConfigurationError";
        publish({ ...signedOut(), status: configuration ? "configuration-error" : "session-error", error: configuration ? error.message : "Unable to verify your session. Please try again." });
      }
    }
  };

  return {
    getSnapshot: () => state,
    getServerSnapshot: () => INITIAL_AUTH_STATE,
    refresh,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) void refresh();
      return () => {
        listeners.delete(listener);
        if (!listeners.size) {
          ++revision;
          ++generation;
          unsubscribe?.();
          unsubscribe = null;
          source = null;
          state = INITIAL_AUTH_STATE;
        }
      };
    },
  };
}
