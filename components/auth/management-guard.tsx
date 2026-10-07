"use client";

import { Fragment, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/use-auth";
import { authStore } from "@/lib/auth/auth";
import { getManagementAccess, MANAGEMENT_ROLES } from "@/lib/auth/access";
import type { UserRole } from "@/lib/auth/types";
import { LogoutButton } from "./logout-button";

export function ManagementGuard({ children, allowedRoles = MANAGEMENT_ROLES }: {
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
    return <main className="flex min-h-screen items-center justify-center" role="status">Loading your account...</main>;
  }
  if (access === "sign-in") {
    return <main className="flex min-h-screen items-center justify-center"><Link href="/login">Sign in to continue</Link></main>;
  }
  if (access === "error" || access === "denied") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <section className="max-w-md space-y-4 rounded-xl border p-6">
          <h1 className="text-xl font-semibold">{access === "error" ? "Unable to verify access" : "Access unavailable"}</h1>
          <p role="alert">{state.error || "An active profile with access to this management screen is required. Contact an administrator if you need access."}</p>
          {access === "error" && <button type="button" className="rounded-md border px-4 py-2" onClick={() => void authStore.refresh()}>Try again</button>}
          {state.isAuthenticated && <LogoutButton />}
          <Link href="/" className="block underline">Back to platform</Link>
        </section>
      </main>
    );
  }
  // A new account must not inherit the previous account's mounted dashboard state.
  return <Fragment key={`${state.user?.id}:${state.role}`}>{children}</Fragment>;
}
