"use client";

import Link from "next/link";
import { Settings, User, Shield } from "lucide-react";
import { ManagementGuard } from "@/components/auth/management-guard";
import { useAuth } from "@/lib/auth/use-auth";
import { PageHeader } from "@/components/ui/cyberpunk";

function SettingsContent() {
  const { profile, role } = useAuth();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        moduleCode="SYS // 09"
        category="SYSTEM"
        title="Settings"
        description="Manage application configuration and account settings."
        icon={Settings}
      />

      {/* Account info card */}
      <div className="bg-[#111318] border border-[#292D33] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-[#292D33]">
          <div className="flex size-10 items-center justify-center rounded-full bg-[#1D2026] text-sm font-semibold text-[#F3F1EC]">
            {(profile?.displayName || profile?.email || "A").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-[#F3F1EC]">{profile?.displayName || profile?.email || "Account"}</p>
            <p className="text-xs text-[#9B9EA6] capitalize">{role} · Coders Club CIET</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#9B9EA6] mb-1.5">Email</p>
            <p className="text-sm text-[#F3F1EC]">{profile?.email || "—"}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#9B9EA6] mb-1.5">Role</p>
            <p className="text-sm text-[#F3F1EC] capitalize">{role || "—"}</p>
          </div>
        </div>
      </div>

      {/* Admin-only section */}
      {role === "admin" && (
        <div className="bg-[#111318] border border-[#292D33] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-4 border-b border-[#292D33]">
            <Shield className="size-4 text-[#F3F1EC]" />
            <h2 className="font-semibold text-[#F3F1EC]">Administrative Controls</h2>
          </div>
          <p className="text-sm text-[#9B9EA6]">
            Platform configuration and admin-only controls are managed through the Supabase administration console. Contact a system administrator for system-level changes.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/associate-requests"
              className="flex items-center gap-3 border border-[#292D33] rounded-lg px-4 py-3 text-sm font-medium text-[#F3F1EC] hover:border-[#3A3E45] hover:bg-[#1D2026] transition-colors"
            >
              <User className="size-4 text-[#F3F1EC]" />
              Associate Requests
            </Link>
            <Link
              href="/associate-allocation"
              className="flex items-center gap-3 border border-[#292D33] rounded-lg px-4 py-3 text-sm font-medium text-[#F3F1EC] hover:border-[#3A3E45] hover:bg-[#1D2026] transition-colors"
            >
              <User className="size-4 text-[#F3F1EC]" />
              Associate Allocation
            </Link>
          </div>
        </div>
      )}

      {/* Profile actions */}
      <div className="bg-[#111318] border border-[#292D33] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 pb-4 border-b border-[#292D33]">
          <User className="size-4 text-[#F3F1EC]" />
          <h2 className="font-semibold text-[#F3F1EC]">Account Actions</h2>
        </div>
        <p className="text-sm text-[#9B9EA6]">
          Use the navigation menu to sign out. Password changes require contacting your administrator.
        </p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ManagementGuard>
      <SettingsContent />
    </ManagementGuard>
  );
}
