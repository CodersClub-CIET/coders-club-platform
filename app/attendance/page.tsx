"use client";

export const dynamic = "force-dynamic";

import AttendanceManagementPage from "@/app/protected/attendance/page";

import { ManagementGuard } from "@/components/auth/management-guard";
import { AssociateAllocationGuard } from "@/components/auth/associate-allocation-guard";

export default function AttendanceStandalonePage() {
  return <ManagementGuard><AssociateAllocationGuard scope="attendance"><AttendanceManagementPage /></AssociateAllocationGuard></ManagementGuard>;
}
