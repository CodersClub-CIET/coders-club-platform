import { NextResponse } from "next/server";
import { createCallerClient } from "@/lib/supabase/server-caller";
import { createServiceRoleClient } from "@/lib/supabase/server-admin";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const caller = await createCallerClient();
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: "Sign in is required." }, { status: 401 });
    const { data: profile } = await caller.from("user_profiles").select("role, is_active").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin" || profile.is_active !== true) return NextResponse.json({ success: false, error: "Administrator access is required." }, { status: 403 });
    const body = await request.json().catch(() => ({})) as { reason?: unknown };
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ success: false, error: "Invalid access request ID." }, { status: 400 });
    const admin = createServiceRoleClient();
    const { data, error } = await admin.from("associate_access_requests").update({
      status: "rejected", rejection_reason: reason || null, reviewed_at: new Date().toISOString(), reviewed_by: user.id,
    }).eq("id", id).eq("status", "pending").select("id").maybeSingle();
    if (error) return NextResponse.json({ success: false, error: "Unable to reject this request." }, { status: 500 });
    if (!data) return NextResponse.json({ success: false, error: "This request has already been processed." }, { status: 409 });
    return NextResponse.json({ success: true, message: "Associate access request rejected.", requestId: id, status: "rejected" });
  } catch (error) {
    console.error("Associate access rejection failed.", error);
    return NextResponse.json({ success: false, error: "Unable to process this request right now." }, { status: 500 });
  }
}
