export class SupabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigurationError";
  }
}

/** Readiness checks only; key claims are NOT a user authorization source. */
export function validateSupabaseConfiguration(url?: string, key?: string) {
  const fail = () => {
    throw new SupabaseConfigurationError(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local, then restart the application."
    );
  };
  if (!url || !key || /placeholder|your[-_ ]/i.test(url + key)) return fail();
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return fail();
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if ((parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) || parsed.username || parsed.password) return fail();
  if (key.startsWith("sb_secret_")) return fail();
  if (!key.startsWith("sb_publishable_")) {
    // Also support the existing Supabase legacy anon-key format, never service_role.
    try {
      const payload: unknown = JSON.parse(atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (!payload || typeof payload !== "object" || !("role" in payload) || payload.role !== "anon") return fail();
    } catch {
      return fail();
    }
  }
  return { url, key };
}

export function getSupabaseConfiguration() {
  return validateSupabaseConfiguration(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
