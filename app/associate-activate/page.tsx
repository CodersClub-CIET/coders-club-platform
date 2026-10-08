"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ShieldCheck, Terminal, ArrowLeft } from "lucide-react";

export default function AssociateActivatePage() {
  const [email, setEmail] = useState("");
  const [activationCredential, setActivationCredential] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleActivate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!activationCredential.trim()) {
      setError("Please enter your activation credential.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/associate-activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          activationCredential: activationCredential.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Activation failed. Please check your credentials or contact an administrator.");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#08090B] text-[#F3F1EC] selection:bg-[#FF2A1A] selection:text-white flex flex-col justify-between">
      {/* Top Bar */}
      <header className="border-b border-[#292D33] px-6 py-4 sm:px-10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded border border-[#292D33] bg-[#0D0F12] text-[#FF2A1A]">
            <Terminal className="size-3.5" />
          </div>
          <span className="font-mono text-xs font-bold tracking-[0.2em] text-[#F3F1EC]">
            CODERS CLUB CIET
          </span>
        </Link>
        <Link
          href="/login"
          className="font-mono text-xs text-[#9B9EA6] hover:text-[#F3F1EC] transition-colors"
        >
          ← RETURN TO LOGIN
        </Link>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-xl px-6 py-12 w-full flex-1 flex flex-col justify-center">
        <div className="space-y-8">
          <div className="space-y-3 border-b border-[#292D33] pb-6">
            <div className="flex items-center gap-2.5">
              <span className="h-[2px] w-6 bg-[#FF2A1A]" />
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-[#FF2A1A]">
                CREDENTIAL INITIALIZATION
              </p>
            </div>
            <h1 className="font-display-title text-[#F3F1EC] tracking-tight">
              Activate Associate Account
            </h1>
            <p className="text-sm text-[#9B9EA6] font-normal leading-relaxed">
              Verify your approved administrator token and establish your secure account password.
            </p>
          </div>

          {success ? (
            <div className="border border-[#32C979]/30 bg-[#32C979]/5 p-8 space-y-4 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#32C979]/10 border border-[#32C979]/20">
                <CheckCircle2 className="size-6 text-[#32C979]" />
              </div>
              <h2 className="font-display text-2xl font-light text-[#F3F1EC]">
                Account Activated Successfully.
              </h2>
              <p className="text-xs text-[#9B9EA6] font-mono leading-relaxed max-w-sm mx-auto">
                Your coordinator credentials are fully authorized. You can now authenticate into the platform.
              </p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 bg-[#FF2A1A] hover:bg-[#C51D16] text-white font-mono text-xs font-bold uppercase tracking-widest px-8 py-3.5 rounded transition-colors"
                >
                  PROCEED TO LOGIN
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleActivate} className="border border-[#292D33] bg-[#0D0F12] p-8 sm:p-10 space-y-5">
              <div className="space-y-1.5">
                <label className="block font-mono text-[10px] uppercase tracking-wider text-[#9B9EA6]">
                  Registered Associate Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. associate@ciet.edu.in"
                  className="w-full bg-[#08090B] border border-[#292D33] text-[#F3F1EC] rounded px-4 py-2.5 focus:border-[#FF2A1A]/50 focus:outline-none text-sm placeholder:text-[#686C74] font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-mono text-[10px] uppercase tracking-wider text-[#9B9EA6]">
                  64-Character Activation Token
                </label>
                <textarea
                  required
                  rows={2}
                  value={activationCredential}
                  onChange={(e) => setActivationCredential(e.target.value)}
                  placeholder="Paste your one-time activation credential..."
                  className="w-full bg-[#08090B] border border-[#292D33] text-[#F3F1EC] rounded px-4 py-2.5 focus:border-[#FF2A1A]/50 focus:outline-none text-xs placeholder:text-[#686C74] font-mono break-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-[#9B9EA6]">
                    Set Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full bg-[#08090B] border border-[#292D33] text-[#F3F1EC] rounded px-4 py-2.5 focus:border-[#FF2A1A]/50 focus:outline-none text-sm placeholder:text-[#686C74] font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-[#9B9EA6]">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full bg-[#08090B] border border-[#292D33] text-[#F3F1EC] rounded px-4 py-2.5 focus:border-[#FF2A1A]/50 focus:outline-none text-sm placeholder:text-[#686C74] font-mono"
                  />
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="text-[#FF2A1A] text-xs font-mono bg-[#FF2A1A]/5 border border-[#FF2A1A]/20 p-3"
                >
                  {error}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#FF2A1A] hover:bg-[#C51D16] text-white font-mono text-xs uppercase tracking-widest py-3.5 transition-colors font-bold disabled:opacity-50"
                >
                  {loading ? (
                    <span>INITIALIZING CREDENTIALS...</span>
                  ) : (
                    <>
                      <ShieldCheck className="size-4" />
                      <span>ACTIVATE CREDENTIAL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[#686C74] pt-4 border-t border-[#292D33]">
                <Link href="/login" className="inline-flex items-center gap-1 hover:text-[#F3F1EC] transition-colors">
                  <ArrowLeft className="size-3" />
                  <span>LOGIN</span>
                </Link>
                <Link href="/associate-request" className="text-[#FF2A1A] hover:text-[#C51D16] transition-colors">
                  NEED TO REQUEST ACCESS?
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

      <footer className="border-t border-[#292D33] px-6 py-4 text-center font-mono text-[10px] text-[#686C74]">
        AUTHORITATIVE CREDENTIAL DISPATCH // CODERS CLUB PLATFORM
      </footer>
    </div>
  );
}
