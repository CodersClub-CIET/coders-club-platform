import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server-admin";

// Simple in-memory rate limiter per IP: max 20 lookups per 60 seconds
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

export type AssociateStatusResult =
  | "none"
  | "pending"
  | "approved_awaiting_activation"
  | "rejected"
  | "activated";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many status checks. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
    if (!rawEmail || !rawEmail.includes("@")) {
      return NextResponse.json({ status: "none" as AssociateStatusResult });
    }

    const normalizedEmail = rawEmail.toLowerCase();
    const admin = createServiceRoleClient();

    // Check if an active associate profile exists
    const { data: profile } = await admin
      .from("user_profiles")
      .select("id")
      .ilike("email", normalizedEmail)
      .eq("role", "associate")
      .eq("is_active", true)
      .maybeSingle();

    if (profile) {
      return NextResponse.json({ status: "activated" as AssociateStatusResult });
    }

    // Check associate_access_requests for most recent request
    const { data: accessRequest } = await admin
      .from("associate_access_requests")
      .select("status, approved_auth_user_id")
      .ilike("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!accessRequest) {
      return NextResponse.json({ status: "none" as AssociateStatusResult });
    }

    if (accessRequest.status === "approved") {
      if (accessRequest.approved_auth_user_id) {
        return NextResponse.json({ status: "activated" as AssociateStatusResult });
      }
      return NextResponse.json({ status: "approved_awaiting_activation" as AssociateStatusResult });
    }

    if (accessRequest.status === "pending" || accessRequest.status === "processing") {
      return NextResponse.json({ status: "pending" as AssociateStatusResult });
    }

    if (accessRequest.status === "rejected") {
      return NextResponse.json({ status: "rejected" as AssociateStatusResult });
    }

    return NextResponse.json({ status: "none" as AssociateStatusResult });
  } catch (error) {
    console.error("Associate status check failed.", error);
    return NextResponse.json({ status: "none" as AssociateStatusResult });
  }
}
