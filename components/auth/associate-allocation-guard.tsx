"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/use-auth";
import { createClient } from "@/lib/supabase/client";

type AllocationScope = "event" | "attendance";

export function AssociateAllocationGuard({
  scope,
  children,
}: {
  scope: AllocationScope;
  children: React.ReactNode;
}) {
  const { user, role } = useAuth();
  const [status, setStatus] = useState<"loading" | "allowed" | "denied" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function verifyAllocation() {
      if (role === "admin") {
        setStatus("allowed");
        return;
      }
      if (role !== "associate" || !user) {
        setStatus("denied");
        return;
      }

      try {
        const supabase = createClient();
        const { data: associate, error: associateError } = await supabase
          .from("associates")
          .select("id")
          .eq("auth_user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();
        if (associateError) throw associateError;
        if (!associate) {
          if (!cancelled) setStatus("denied");
          return;
        }

        let query = supabase
          .from("associate_allocations")
          .select("id")
          .eq("associate_id", associate.id)
          .eq("is_active", true);
        if (scope === "attendance") query = query.eq("attendance_access", true);
        const { data, error } = await query.limit(1);
        if (error) throw error;
        if (!cancelled) setStatus(data && data.length > 0 ? "allowed" : "denied");
      } catch (error) {
        console.error(`Associate ${scope} access verification failed:`, error);
        if (!cancelled) setStatus("error");
      }
    }

    void verifyAllocation();
    return () => {
      cancelled = true;
    };
  }, [role, scope, user?.id]);

  if (status === "loading") {
    return <main className="flex min-h-[40vh] items-center justify-center" role="status">Verifying your assigned access...</main>;
  }
  if (status === "error") {
    return (
      <main className="flex min-h-[40vh] items-center justify-center p-6">
        <section className="max-w-md border border-red-200 bg-red-50 p-6">
          <h1 className="font-semibold text-red-900">Unable to verify access</h1>
          <p className="mt-2 text-sm text-red-800">We could not verify your current allocation. Try again shortly or contact an administrator.</p>
        </section>
      </main>
    );
  }
  if (status === "denied") {
    return (
      <main className="flex min-h-[40vh] items-center justify-center p-6">
        <section className="max-w-md border border-[#292D33] bg-[#111318] p-6 shadow-sm">
          <h1 className="font-semibold text-slate-950">Access not assigned</h1>
          <p className="mt-2 text-sm text-[#686C74]">Your account does not have an active allocation for this operation.</p>
          <Link href="/associate/dashboard" className="mt-4 inline-block text-sm font-semibold text-indigo-700 hover:underline">Back to dashboard</Link>
        </section>
      </main>
    );
  }
  return <>{children}</>;
}
