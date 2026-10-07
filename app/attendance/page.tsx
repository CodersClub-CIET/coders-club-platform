"use client";

export const dynamic = "force-dynamic";

import AttendanceManagementPage from "@/app/protected/attendance/page";

import { ManagementGuard } from "@/components/auth/management-guard";

export default function AttendanceStandalonePage() {
  return <ManagementGuard><AttendanceManagementPage /></ManagementGuard>;
}
