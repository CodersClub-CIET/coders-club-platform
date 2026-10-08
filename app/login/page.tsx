"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUser, signOut } from "@/lib/auth/auth";
import type { UserRole } from "@/lib/auth/types";
import { useAuth } from "@/lib/auth/use-auth";
import { Shield, UserCheck, KeyRound, ArrowRight, AlertCircle, Info, Terminal } from "lucide-react";
import type { AssociateStatusResult } from "@/app/api/associate-status/route";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (auth.status === "authorized" && auth.role) {
      router.replace(auth.role === "admin" ? "/admin/dashboard" : "/associate/dashboard");
    }
  }, [auth.role, auth.status, router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("associate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [associateNotice, setAssociateNotice] = useState<{
    type: "info" | "warning" | "error" | "action";
    message: string;
    actionUrl?: string;
    actionLabel?: string;
  } | null>(null);

  // When email changes in Associate mode, perform debounced lookup if user blurs
  async function checkAssociateEmailStatus(emailToCheck: string) {
    if (selectedRole !== "associate" || !emailToCheck.includes("@")) return;

    try {
      const res = await fetch("/api/associate-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToCheck }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { status: AssociateStatusResult };

      if (!mountedRef.current) return;

      if (data.status === "none") {
        setAssociateNotice({
          type: "warning",
          message: "Associate access has not been requested for this email.",
          actionUrl: "/associate-request",
          actionLabel: "Request Associate Access",
        });
      } else if (data.status === "pending") {
        setAssociateNotice({
          type: "info",
          message: "Your Associate access request is awaiting Admin approval.",
        });
      } else if (data.status === "approved_awaiting_activation") {
        setAssociateNotice({
          type: "action",
          message: "Your Associate access has been approved! Activate your account with your one-time credential.",
          actionUrl: "/associate-activate",
          actionLabel: "Activate Account Now",
        });
      } else if (data.status === "rejected") {
        setAssociateNotice({
          type: "error",
          message: "Your Associate access request was not approved. Please contact an administrator.",
        });
      } else {
        setAssociateNotice(null);
      }
    } catch {
      // Non-blocking status lookup failure
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const trimmedEmail = email.trim().toLowerCase();

      // Sign in with Supabase auth
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      if (!authData.user) {
        throw new Error("Authentication failed. No user returned.");
      }

      // Authoritative database profile check
      const currentAuthUser = await getCurrentUser();
      if (!currentAuthUser) {
        await signOut();
        throw new Error("Session initialization failed. Try signing in again.");
      }

      // Check user profile exists and is active
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("role, is_active")
        .eq("id", currentAuthUser.id)
        .single();

      if (profileError || !profile) {
        await signOut();
        throw new Error("No authorized profile found. Contact administrator.");
      }

      if (!profile.is_active) {
        await signOut();
        throw new Error("Account has been deactivated. Contact administrator.");
      }

      // Strict role verification: match the chosen role with the profile role
      if (profile.role !== selectedRole) {
        await signOut();
        throw new Error(
          `Unauthorized: Your account does not have '${selectedRole.toUpperCase()}' permissions.`
        );
      }

      // Successful login - route based on authoritative role
      if (profile.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/associate/dashboard");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed.";
      setError(message);
    } finally {
      setLoading(false);
      submittingRef.current = false;
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
          href="/"
          className="font-mono text-xs text-[#9B9EA6] hover:text-[#F3F1EC] transition-colors"
        >
          ← RETURN TO HOME
        </Link>
      </header>

      {/* Editorial Split Hero & Login Panel */}
      <main className="mx-auto max-w-7xl px-6 py-12 sm:px-10 lg:px-12 w-full flex-1 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center w-full">
          {/* Left Editorial Headline Column */}
          <div className="lg:col-span-7 space-y-8">
            <div className="flex items-center gap-2.5">
              <span className="h-[2px] w-8 bg-[#FF2A1A]" />
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-[#FF2A1A]">
                AUTHENTICATION GATEWAY
              </p>
            </div>

            <h1 className="font-display-hero text-[#F3F1EC] tracking-tighter">
              YOUR <br />
              OPERATIONS <br />
              <span className="text-[#9B9EA6] font-light">START HERE.</span>
            </h1>

            <p className="text-sm sm:text-base text-[#9B9EA6] max-w-lg leading-relaxed font-normal">
              Enter your credentials to access your authorized workspace. Strict role-based permissions and cryptographic audit logs are enforced on every session.
            </p>

            <div className="border-t border-[#292D33] pt-6 grid grid-cols-2 gap-6 max-w-md font-mono text-xs text-[#686C74]">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#9B9EA6] mb-1">
                  SECURITY PROTOCOL
                </p>
                <p className="text-[#F3F1EC]">ZERO-TRUST RLS</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#9B9EA6] mb-1">
                  IDENTITY ENFORCEMENT
                </p>
                <p className="text-[#F3F1EC]">AUTHORITATIVE PROFILES</p>
              </div>
            </div>
          </div>

          {/* Right Form Column */}
          <div className="lg:col-span-5">
            <div className="border border-[#292D33] bg-[#0D0F12] p-8 sm:p-10 relative shadow-2xl">
              {/* Subtle top red laser accent line */}
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF2A1A] to-transparent" />

              <div className="space-y-6">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#9B9EA6]">
                    SESSION INITIALIZATION
                  </p>
                  <h2 className="font-display text-2xl font-light text-[#F3F1EC] mt-1">
                    Select Access Role
                  </h2>
                </div>

                {/* Role Switcher */}
                <fieldset>
                  <legend className="sr-only">Choose authorization role</legend>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole("admin");
                        setError("");
                        setAssociateNotice(null);
                      }}
                      className={`flex items-center justify-center gap-2 border px-4 py-3 text-xs transition font-mono tracking-wider ${
                        selectedRole === "admin"
                          ? "border-[#FF2A1A]/60 bg-[#FF2A1A]/10 text-[#FF2A1A] font-bold"
                          : "border-[#292D33] bg-[#08090B] text-[#686C74] hover:bg-[#111318] hover:text-[#9B9EA6]"
                      }`}
                    >
                      <Shield className="size-3.5" />
                      <span>ADMIN</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole("associate");
                        setError("");
                      }}
                      className={`flex items-center justify-center gap-2 border px-4 py-3 text-xs transition font-mono tracking-wider ${
                        selectedRole === "associate"
                          ? "border-[#FF2A1A]/60 bg-[#FF2A1A]/10 text-[#FF2A1A] font-bold"
                          : "border-[#292D33] bg-[#08090B] text-[#686C74] hover:bg-[#111318] hover:text-[#9B9EA6]"
                      }`}
                    >
                      <UserCheck className="size-3.5" />
                      <span>ASSOCIATE</span>
                    </button>
                  </div>
                </fieldset>

                {/* Associate Lifecycle Notices */}
                {associateNotice && selectedRole === "associate" && (
                  <div
                    className={`border p-3.5 text-xs space-y-2 ${
                      associateNotice.type === "action"
                        ? "border-[#FF2A1A]/40 bg-[#FF2A1A]/10 text-[#F3F1EC]"
                        : associateNotice.type === "warning"
                        ? "border-[#F2B84B]/40 bg-[#F2B84B]/10 text-[#F2B84B]"
                        : associateNotice.type === "error"
                        ? "border-[#FF2A1A]/40 bg-[#FF2A1A]/10 text-[#FF2A1A]"
                        : "border-[#7FA7FF]/40 bg-[#7FA7FF]/10 text-[#7FA7FF]"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Info className="size-4 shrink-0 mt-0.5" />
                      <p className="leading-relaxed font-mono">{associateNotice.message}</p>
                    </div>
                    {associateNotice.actionUrl && (
                      <div className="pt-1">
                        <Link
                          href={associateNotice.actionUrl}
                          className="inline-flex items-center gap-1.5 font-bold font-mono tracking-wider hover:text-white hover:underline transition-colors"
                          style={{ color: associateNotice.type === "action" ? "#FF2A1A" : "inherit" }}
                        >
                          <span>{associateNotice.actionLabel}</span>
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="email"
                      className="block font-mono text-[10px] uppercase tracking-wider text-[#9B9EA6]"
                    >
                      {selectedRole === "admin" ? "Admin Email" : "Associate Email"}
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="username"
                      required
                      value={email}
                      onBlur={() => {
                        if (selectedRole === "associate") {
                          void checkAssociateEmailStatus(email.trim());
                        }
                      }}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (associateNotice) setAssociateNotice(null);
                      }}
                      placeholder={selectedRole === "admin" ? "admin@ciet.edu.in" : "associate@ciet.edu.in"}
                      className="bg-[#08090B] border border-[#292D33] text-[#F3F1EC] px-4 py-3 focus:border-[#FF2A1A]/50 focus:outline-none w-full text-sm placeholder:text-[#686C74] font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="password"
                      className="block font-mono text-[10px] uppercase tracking-wider text-[#9B9EA6]"
                    >
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-[#08090B] border border-[#292D33] text-[#F3F1EC] px-4 py-3 focus:border-[#FF2A1A]/50 focus:outline-none w-full text-sm placeholder:text-[#686C74] font-mono"
                    />
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 text-[#FF2A1A] text-xs font-mono bg-[#FF2A1A]/5 border border-[#FF2A1A]/20 p-3"
                    >
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#FF2A1A] hover:bg-[#C51D16] text-white font-mono text-xs uppercase tracking-widest py-3.5 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "INITIALIZING SESSION..." : "AUTHENTICATE"}
                    </button>
                  </div>
                </form>

                {/* Associate Actions */}
                <div className="border-t border-[#292D33] pt-6 space-y-3">
                  <p className="text-center font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#686C74]">
                    ASSOCIATE ONBOARDING
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <Link
                      href="/associate-request"
                      className="flex items-center justify-center gap-1.5 border border-[#292D33] bg-[#08090B] px-3 py-2.5 font-mono text-xs text-[#9B9EA6] hover:border-[#FF2A1A]/50 hover:text-[#F3F1EC] transition-colors"
                    >
                      <span>REQUEST</span>
                    </Link>
                    <Link
                      href="/associate-activate"
                      className="flex items-center justify-center gap-1.5 border border-[#292D33] bg-[#08090B] px-3 py-2.5 font-mono text-xs text-[#9B9EA6] hover:border-[#FF2A1A]/50 hover:text-[#F3F1EC] transition-colors"
                    >
                      <KeyRound className="size-3.5" />
                      <span>ACTIVATE</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#292D33] px-6 py-4 text-center font-mono text-[10px] text-[#686C74]">
        SECURE GATEWAY ENFORCEMENT // CODERS CLUB MANAGEMENT PLATFORM
      </footer>
    </div>
  );
}