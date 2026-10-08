import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server-admin";
import {
  getActivationCredentialRecord,
  recordFailedAttempt,
  markCredentialConsumed,
  verifyActivationCredential,
} from "@/lib/associates/activation";

// Rate limiting: max 10 activation attempts per IP per 5 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 300000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

const GENERIC_ERROR = "Activation failed. Please check your credentials or contact an administrator.";

export async function POST(request: Request) {
  let createdAuthUserId: string | null = null;
  let admin: ReturnType<typeof createServiceRoleClient> | null = null;

  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: "Too many activation attempts. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      activationCredential?: string;
      password?: string;
    };

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const activationCredential = typeof body.activationCredential === "string" ? body.activationCredential.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    // Input validation
    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, error: GENERIC_ERROR }, { status: 400 });
    }
    if (!activationCredential || activationCredential.length !== 64) {
      return NextResponse.json({ success: false, error: GENERIC_ERROR }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    admin = createServiceRoleClient();

    // Check if an active account already exists
    const { data: existingProfile } = await admin
      .from("user_profiles")
      .select("id")
      .ilike("email", email)
      .eq("is_active", true)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { success: false, error: "An active account already exists for this email. Please sign in." },
        { status: 409 }
      );
    }

    // Find the approved access request
    const { data: accessRequest, error: requestError } = await admin
      .from("associate_access_requests")
      .select("*")
      .ilike("email", email)
      .eq("status", "approved")
      .is("approved_auth_user_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (requestError || !accessRequest) {
      return NextResponse.json({ success: false, error: GENERIC_ERROR }, { status: 400 });
    }

    // Retrieve credential record
    const credentialRecord = await getActivationCredentialRecord(accessRequest.id);
    if (!credentialRecord) {
      return NextResponse.json({ success: false, error: GENERIC_ERROR }, { status: 400 });
    }

    // Validate credential state
    if (credentialRecord.isConsumed) {
      return NextResponse.json(
        { success: false, error: "This activation credential has already been used. Please log in." },
        { status: 400 }
      );
    }

    if (credentialRecord.isSuperseded) {
      return NextResponse.json(
        { success: false, error: "This activation credential has been replaced. Please use your newest credential." },
        { status: 400 }
      );
    }

    if (new Date(credentialRecord.expiresAt).getTime() < Date.now()) {
      return NextResponse.json(
        { success: false, error: "This activation credential has expired. Please contact an administrator to reissue." },
        { status: 400 }
      );
    }

    if (credentialRecord.failedAttempts >= credentialRecord.maxAttempts) {
      return NextResponse.json(
        {
          success: false,
          error: "This activation credential is locked due to too many failed attempts. Please contact an administrator to reissue.",
        },
        { status: 400 }
      );
    }

    // Verify cryptographic credential
    const isValid = verifyActivationCredential(activationCredential, credentialRecord.credentialHash);
    if (!isValid) {
      await recordFailedAttempt(accessRequest.id, credentialRecord.failedAttempts);
      return NextResponse.json({ success: false, error: GENERIC_ERROR }, { status: 400 });
    }

    // 15. AUTH USER CREATION (Server-only Supabase Auth admin API)
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: accessRequest.full_name,
      },
    });

    if (authError || !authUser.user) {
      throw new Error(authError?.message || "Failed to create user account.");
    }

    createdAuthUserId = authUser.user.id;

    // Create/verify user_profiles
    const { error: profileError } = await admin.from("user_profiles").upsert({
      id: createdAuthUserId,
      role: "associate",
      is_active: true,
      display_name: accessRequest.full_name,
      email,
    });

    if (profileError) {
      throw new Error(`Failed to create application profile: ${profileError.message}`);
    }

    // Create/verify associates record
    const { error: associateError } = await admin.from("associates").upsert({
      auth_user_id: createdAuthUserId,
      name: accessRequest.full_name,
      email,
      phone: accessRequest.phone,
      is_active: true,
    });

    if (associateError) {
      throw new Error(`Failed to create associate record: ${associateError.message}`);
    }

    // Consume credential record
    await markCredentialConsumed(accessRequest.id);

    // Mark associate_access_requests.approved_auth_user_id
    const { error: linkError } = await admin
      .from("associate_access_requests")
      .update({
        approved_auth_user_id: createdAuthUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accessRequest.id);

    if (linkError) {
      console.warn("Could not link approved auth user ID on request row:", linkError.message);
    }

    return NextResponse.json({
      success: true,
      message: "Your Associate account has been successfully activated. You may now sign in.",
    });
  } catch (error) {
    // Orphan cleanup rollback
    if (createdAuthUserId && admin) {
      try {
        await admin.auth.admin.deleteUser(createdAuthUserId);
        await admin.from("user_profiles").delete().eq("id", createdAuthUserId);
        await admin.from("associates").delete().eq("auth_user_id", createdAuthUserId);
      } catch (cleanupErr) {
        console.error("Cleanup of orphan user failed:", cleanupErr);
      }
    }

    console.error("Associate activation exception:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Activation failed. Please contact an administrator.",
      },
      { status: 500 }
    );
  }
}
