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
  try {
    const auth = await authorizeAdmin();
    if ("error" in auth) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ success: false, error: "Invalid access request ID." }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const { data: accessRequest, error: requestError } = await admin
      .from("associate_access_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (requestError || !accessRequest) {
      return NextResponse.json({ success: false, error: "Access request not found." }, { status: 404 });
    }

    if (accessRequest.status !== "approved" || accessRequest.approved_auth_user_id) {
      return NextResponse.json(
        {
          success: false,
          error: accessRequest.approved_auth_user_id
            ? "This account has already been activated. Reissuing is not permitted."
            : "Only approved requests awaiting activation can have credentials reissued.",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = accessRequest.email.trim().toLowerCase();

    // Check if account was already created
    const { data: existingProfile } = await admin
      .from("user_profiles")
      .select("id")
      .ilike("email", normalizedEmail)
      .eq("is_active", true)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { success: false, error: "An active account already exists for this email." },
        { status: 409 }
      );
    }

    // Generate new credential
    const rawCredential = generateActivationCredential();
    const credentialHash = hashActivationCredential(rawCredential);

    const storedRecord = await storeActivationCredential(
      id,
      normalizedEmail,
      credentialHash,
      auth.user.id
    );

    return NextResponse.json({
      success: true,
      message: "Activation credential successfully reissued. Provide it securely to the Associate.",
      requestId: id,
      email: normalizedEmail,
      fullName: accessRequest.full_name,
      activationCredential: rawCredential,
      expiresAt: storedRecord.expiresAt,
    });
  } catch (error) {
    console.error("Credential reissue failed.", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to reissue credential.",
      },
      { status: 500 }
    );
  }
}
