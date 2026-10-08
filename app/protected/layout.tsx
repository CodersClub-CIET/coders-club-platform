"use client";

import { ManagementGuard } from "@/components/auth/management-guard";

export default function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ManagementGuard>{children}</ManagementGuard>;
}
