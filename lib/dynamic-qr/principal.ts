import type { SupabaseClient } from "@supabase/supabase-js";
import { QRHttpError, databaseError, type Principal } from "./http";
/** Group C identity/profile contract, verified independently at the server boundary. */
export async function verifyQRPrincipal(db: SupabaseClient, bearer?: string): Promise<Principal> {
      const result = await db.auth.getUser(bearer);
      if (result.error) {
        if (result.error.status === 400 || result.error.status === 401 || result.error.status === 403 || result.error.name === "AuthSessionMissingError") throw new QRHttpError(401, "Sign in is required.");
        throw new QRHttpError(500, "Authentication service unavailable.");
      }
      const user = result.data.user; if (!user) throw new QRHttpError(401, "Sign in is required.");
      const profile = await db.from("user_profiles").select("id,role,is_active").eq("id", user.id).maybeSingle();
      databaseError(profile.error);
      if (!profile.data || profile.data.id !== user.id || profile.data.is_active !== true ||
          (profile.data.role !== "admin" && profile.data.role !== "associate")) throw new QRHttpError(403, "An active management profile is required.");
      return {id:user.id, role:profile.data.role};
}
