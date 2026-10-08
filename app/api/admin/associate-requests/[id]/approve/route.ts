import { NextResponse } from "next/server";
import { createCallerClient } from "@/lib/supabase/server-caller";
import { createServiceRoleClient } from "@/lib/supabase/server-admin";
import {
  generateActivationCredential,
  hashActivationCredential,
  storeActivationCredential,
} from "@/lib/associates/activation";

async function authorizeAdmin() {
  const caller = await createCallerClient();
  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user) return { error: "Sign in is required.", status: 401 as const };
  const { data: profile, error: profileError } = await caller
    .from("user_profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || profile?.role !== "admin" || profile.is_active !== true) {
    return { error: "Administrator access is required.", status: 403 as const };
  }
  return { caller, user };
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  let id = "unknown";
  let claimed = false;

  try {
    const auth = await authorizeAdmin();
    if ("error" in auth) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    ({ id } = await context.params);
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ success: false, error: "Invalid access request ID." }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const { data: accessRequest, error: requestError } = await admin
      .from("associate_access_requests")
      .select("*")
      .eq("id", id)
      .eq("status", "pending")
      .maybeSingle();

    if (requestError) throw new Error("Unable to load the access request.");
    if (!accessRequest) {
      return NextResponse.json(
        { success: false, error: "This request has already been processed or is not in pending status." },
        { status: 409 }
      );
    }

    const normalizedEmail = accessRequest.email.trim().toLowerCase();
    const [
      { data: profile, error: existingProfileError },
      { data: associate, error: existingAssociateError },
    ] = await Promise.all([
      admin.from("user_profiles").select("id").ilike("email", normalizedEmail).eq("is_active", true).maybeSingle(),
      admin.from("associates").select("id").ilike("email", normalizedEmail).eq("is_active", true).maybeSingle(),
    ]);

    if (existingProfileError || existingAssociateError) {
      throw new Error("Unable to verify existing account records.");
    }
    if (profile || associate) {
      return NextResponse.json(
        { success: false, error: "An active account already exists for this email." },
        { status: 409 }
      );
    }

    // Atomic state transition: pending -> processing
    const { data: claimedRow, error: claimError } = await admin
      .from("associate_access_requests")
      .update({
        status: "processing",
        reviewed_at: new Date().toISOString(),
        reviewed_by: auth.user.id,
      })
      .eq("id", id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (claimError || !claimedRow) {
      return NextResponse.json(
        { success: false, error: "This request has already been processed or is currently being processed." },
        { status: 409 }
      );
    }
    claimed = true;

    // Generate cryptographic one-time activation credential (NO EMAIL RATE-LIMIT DEPENDENCY)
    const rawCredential = generateActivationCredential();
    const credentialHash = hashActivationCredential(rawCredential);

    // Securely store hashed credential
    const storedRecord = await storeActivationCredential(
      id,
      normalizedEmail,
      credentialHash,
      auth.user.id
    );

    // Finalize request state to 'approved' (awaiting activation)
    const { error: finalizeError } = await admin
      .from("associate_access_requests")
      .update({
        status: "approved",
        approved_auth_user_id: null, // Set only when associate actually activates
        reviewed_at: new Date().toISOString(),
        reviewed_by: auth.user.id,
      })
      .eq("id", id)
      .eq("status", "processing");

    if (finalizeError) {
      throw new Error("Unable to finalize request approval state.");
    }

    // Return the plaintext credential ONCE to the Admin
    return NextResponse.json({
      success: true,
      message: "Associate request approved. Provide the activation credential securely to the Associate.",
      requestId: id,
      email: normalizedEmail,
      fullName: accessRequest.full_name,
      activationCredential: rawCredential,
      expiresAt: storedRecord.expiresAt,
      status: "approved",
    });
  } catch (error) {
    let admin: ReturnType<typeof createServiceRoleClient> | null = null;
    try {
      admin = createServiceRoleClient();
    } catch {
      // ignore
    }

    if (claimed && admin) {
      // Rollback to pending
      await admin
        .from("associate_access_requests")
        .update({
          status: "pending",
          reviewed_at: null,
          reviewed_by: null,
          approved_auth_user_id: null,
        })
        .eq("id", id)
        .eq("status", "processing");
    }

    console.error("Associate access approval failed.", { requestId: id, error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Associate approval failed.",
      },
      { status: 500 }
    );
  }
}
