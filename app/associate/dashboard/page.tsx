"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AssociateDashboard from "@/components/dashboard/associate-dashboard";
import { ManagementGuard } from "@/components/auth/management-guard";
import { useAuth } from "@/lib/auth/use-auth";

export default function AssociateDashboardPage() {
  const router = useRouter();
  const { role } = useAuth();
  useEffect(() => {
    if (role === "admin") router.replace("/admin/dashboard");
  }, [role, router]);
  return <ManagementGuard allowedRoles={["associate"]}><AssociateDashboard /></ManagementGuard>;
}
