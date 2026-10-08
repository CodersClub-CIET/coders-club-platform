"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    async function establishInvitationSession() {
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const accessToken = searchParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token");

      if (tokenHash && (type === "invite" || type === "recovery")) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type === "invite" ? "invite" : "recovery",
        });
        if (verifyError) {
          if (active) setError("This activation link is invalid or has expired. Ask an administrator to resend the invitation.");
          return;
        }

      } else if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (sessionError) {
          if (active) setError("This activation link is invalid or has expired. Ask an administrator to resend the invitation.");
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (active) {
        setReady(Boolean(session));
        if (!session && !searchParams.get("error")) setError("Open the activation link from your invitation email to set your password.");
      }
    }
    void establishInvitationSession();
    return () => { active = false; };
  }, [searchParams]);

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    setError("");
    const { error: updateError } = await createClient().auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }
    router.replace("/associate/dashboard");
  }

  const queryError = searchParams.get("error");
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4efe8] p-6">
      <section className="w-full max-w-md border border-[#292D33] bg-[#171A20] p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a7351]">Coders Club CIET</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#211b17]">Activate your account</h1>
        <p className="mt-2 text-sm text-[#76695e]">Set a password for your approved Associate account.</p>
        {(error || queryError) && <p role="alert" className="mt-5 border border-red-200 bg-[#fff5f2] p-3 text-sm text-red-800">{error || "This activation link is invalid or has expired. Ask an administrator to resend the invitation."}</p>}
        {ready && !error && !queryError && (
          <form onSubmit={savePassword} className="mt-6 space-y-4">
            <label className="block space-y-1 text-sm font-medium text-[#3c3028]">New password<input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full border border-[#292D33] bg-[#111318] px-3 py-2 outline-none focus:border-[#9a7351]" /></label>
            <label className="block space-y-1 text-sm font-medium text-[#3c3028]">Confirm password<input required type="password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 w-full border border-[#292D33] bg-[#111318] px-3 py-2 outline-none focus:border-[#9a7351]" /></label>
            <button disabled={saving} className="w-full bg-[#111318] px-4 py-3 font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Set password"}</button>
          </form>
        )}
        <Link href="/login" className="mt-6 inline-block text-sm text-[#9a7351] underline">Return to sign in</Link>
      </section>
    </main>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#f4efe8] p-6">Loading account activation...</main>}>
      <SetPasswordContent />
    </Suspense>
  );
}
