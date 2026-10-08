"use client";

import { Fragment, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/use-auth";
import { authStore } from "@/lib/auth/auth";
import { getManagementAccess, MANAGEMENT_ROLES } from "@/lib/auth/access";
import type { UserRole } from "@/lib/auth/types";
import { LogoutButton } from "./logout-button";
import { ApplicationShell } from "@/components/dashboard/application-shell";
import { AlertTriangle, Lock, RefreshCw, ShieldAlert } from "lucide-react";

export function ManagementGuard({
  children,
  allowedRoles = MANAGEMENT_ROLES,
}: {
  children: React.ReactNode;
  allowedRoles?: readonly UserRole[];
}) {
  const state = useAuth();
  const router = useRouter();
  const access = getManagementAccess(state, allowedRoles);

  useEffect(() => {
    if (access === "sign-in") router.replace("/login");
  }, [access, router]);

  if (access === "loading") {
    return (
      <main
        className="flex min-h-screen flex-col items-center justify-center bg-[#08090B] text-[#F3F1EC] p-6"
        role="status"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 rounded-full border-2 border-[#FF2A1A] border-t-transparent animate-spin" />
          <div className="text-center font-mono">
            <p className="text-xs tracking-[0.2em] text-[#FF2A1A] uppercase">
              AUTHENTICATING NODE
            </p>
            <p className="text-[11px] text-[#686C74] mt-1">
              Verifying user profile &amp; security boundaries...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (access === "sign-in") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#08090B] text-[#F3F1EC] p-6">
        <div className="rounded-xl border border-[#292D33] bg-[#111318] p-8 text-center max-w-sm w-full space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-[#FF2A1A]/30 bg-[#FF2A1A]/10 text-[#FF2A1A]">
            <Lock className="size-6" />
          </div>
          <h1 className="font-display text-lg font-bold">SESSION REQUIRED</h1>
          <p className="text-xs text-[#9B9EA6]">
            Please sign in to access the Coders Club management console.
          </p>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-lg bg-[#FF2A1A] px-4 py-2.5 text-xs font-mono font-bold text-white hover:bg-[#C51D16] transition-colors"
          >
            ENTER CREDENTIALS
          </Link>
        </div>
      </main>
    );
  }

  if (access === "error" || access === "denied") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#08090B] text-[#F3F1EC] p-6">
        <section className="max-w-md w-full space-y-5 rounded-xl border border-[#FF2A1A]/40 bg-[#111318] p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-3 text-[#FF2A1A]">
            <ShieldAlert className="size-6 shrink-0" />
            <h1 className="font-display text-lg font-bold tracking-tight">
              {access === "error" ? "VERIFICATION FAILURE" : "ACCESS RESTRICTED"}
            </h1>
          </div>
          <p
            role="alert"
            className="text-xs text-[#9B9EA6] leading-relaxed font-mono border-l-2 border-[#292D33] pl-3 py-1"
          >
            {state.error ||
              "An active user profile with appropriate management credentials is required to access this console. Contact platform administration if required."}
          </p>
          <div className="space-y-2 pt-2">
            {access === "error" && (
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#292D33] bg-[#171A20] px-4 py-2.5 text-xs font-mono font-semibold text-[#F3F1EC] hover:border-[#3A3E45] hover:bg-[#1D2026] transition-colors"
                onClick={() => void authStore.refresh()}
              >
                <RefreshCw className="size-3.5" />
                <span>RETRY AUTHENTICATION</span>
              </button>
            )}
            {state.isAuthenticated && <LogoutButton />}
            <Link
              href="/"
              className="block text-center text-xs font-mono text-[#686C74] hover:text-[#9B9EA6] pt-1"
            >
              ← RETURN TO TERMINAL HOME
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // A new account must not inherit the previous account's mounted dashboard state.
  return (
    <Fragment key={`${state.user?.id}:${state.role}`}>
      {state.role ? (
        <ApplicationShell role={state.role}>{children}</ApplicationShell>
      ) : (
        children
      )}
    </Fragment>
  );
}
