import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfiguration } from "./config";

export function createClient() {
  const { url, key } = getSupabaseConfiguration();
  return createBrowserClient(url, key);
}
