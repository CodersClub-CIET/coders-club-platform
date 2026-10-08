import { NextResponse } from "next/server";
import { createCallerClient } from "@/lib/supabase/server-caller";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") === "/login" ? "/login" : "/set-password";

  if (!code) {
    return NextResponse.redirect(new URL("/set-password?error=missing_code", requestUrl.origin));
  }

  const supabase = await createCallerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Supabase invitation callback failed.", error);
    return NextResponse.redirect(new URL("/set-password?error=invalid_or_expired_invitation", requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
