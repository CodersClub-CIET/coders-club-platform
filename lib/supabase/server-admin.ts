import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfiguration } from "./config";

export function createServiceRoleClient(): SupabaseClient {
  const { url } = getSupabaseConfiguration();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key.startsWith("sb_publishable_")) {
    throw new Error("Server-side Supabase service configuration is missing.");
  }
  if (key.startsWith("sb_secret_")) {
    return createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8")) as { role?: string };
    if (payload.role !== "service_role") throw new Error("Invalid service role.");
  } catch {
    throw new Error("Server-side Supabase service configuration is missing.");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
