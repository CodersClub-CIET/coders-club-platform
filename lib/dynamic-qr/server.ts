import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfiguration } from "../supabase/config";
import { verifyQRPrincipal } from "./principal";
import { SupabaseQRRepository } from "./repository";
import { QRHttpError, type QRDependencies } from "./http";

/** Request-scoped caller client; no singleton session, Map, service key or role cache. */
export function qrDependencies(request: Request): QRDependencies {
  let callerPromise: Promise<SupabaseClient> | undefined;
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const caller = () => callerPromise ??= (async () => {
    const {url, key} = getSupabaseConfiguration(); const jar = await cookies();
    return createServerClient(url, key, {
      ...(bearer ? {global:{headers:{Authorization:`Bearer ${bearer}`}}} : {}),
      cookies:{getAll:() => jar.getAll(), setAll: values => { for (const {name, value, options} of values) jar.set(name, value, options); }},
    });
  })();
  const anonymous = () => {
    const {url, key} = getSupabaseConfiguration();
    return createClient(url, key, {auth:{persistSession:false, autoRefreshToken:false, detectSessionInUrl:false}});
  };
  return {
    repository: new SupabaseQRRepository(caller, anonymous),
    authorize: async () => {
      // Credential presence is not identity; getUser must verify it with Supabase.
      if (!bearer && !/(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/.test(request.headers.get("cookie") ?? "")) throw new QRHttpError(401, "Sign in is required.");
      return verifyQRPrincipal(await caller(), bearer);
    },
  };
}
