import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfiguration } from "./config";

export async function createCallerClient() {
  const { url, key } = getSupabaseConfiguration();
  const jar = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        values.forEach(({ name, value, options }) => jar.set(name, value, options));
      },
    },
  });
}
