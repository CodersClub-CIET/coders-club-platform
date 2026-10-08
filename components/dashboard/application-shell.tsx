"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardCheck,
  Cpu,
  Grid2X2,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Users,
  UsersRound,
  X,
  Radio,
} from "lucide-react";
import { useState } from "react";
import type { UserRole } from "@/lib/auth/types";
import { LogoutButton } from "@/components/auth/logout-button";
import { useAuth } from "@/lib/auth/use-auth";

type ShellLink = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: readonly UserRole[];
  group: "Overview" | "Operations" | "Management" | "Coordination" | "Evaluation" | "System";
};

const adminLinks: readonly ShellLink[] = [
  { label: "Command Center", href: "/admin/dashboard", icon: LayoutDashboard, roles: ["admin"], group: "Overview" },
  { label: "Event Operations", href: "/event-management", icon: CalendarDays, roles: ["admin"], group: "Operations" },
  { label: "Attendance Control", href: "/attendance", icon: ClipboardCheck, roles: ["admin"], group: "Operations" },
  { label: "Dynamic QR Protocol", href: "/dynamic-qr", icon: Grid2X2, roles: ["admin"], group: "Operations" },
  { label: "Student Registry", href: "/search-filtering", icon: Users, roles: ["admin"], group: "Management" },
  { label: "Associate Directory", href: "/associates", icon: UsersRound, roles: ["admin"], group: "Management" },
  { label: "Access Requests", href: "/associate-requests", icon: ClipboardCheck, roles: ["admin"], group: "Management" },
  { label: "Resource Allocation", href: "/associate-allocation", icon: Users, roles: ["admin"], group: "Management" },
  { label: "Team Management", href: "/team-management", icon: UsersRound, roles: ["admin"], group: "Management" },
  { label: "Score Control", href: "/scores", icon: BarChart3, roles: ["admin"], group: "Evaluation" },
  { label: "Reports & Analytics", href: "/reports", icon: BarChart3, roles: ["admin"], group: "Evaluation" },
  { label: "System Configuration", href: "/settings", icon: Settings, roles: ["admin"], group: "System" },
];

const associateLinks: readonly ShellLink[] = [
  { label: "Operations Deck", href: "/associate/dashboard", icon: LayoutDashboard, roles: ["associate"], group: "Overview" },
  { label: "My Allocations", href: "/event-management", icon: CalendarDays, roles: ["associate"], group: "Operations" },
  { label: "Attendance Entry", href: "/attendance", icon: ClipboardCheck, roles: ["associate"], group: "Operations" },
  { label: "Live QR Station", href: "/dynamic-qr", icon: Grid2X2, roles: ["associate"], group: "Operations" },
  { label: "Teams Directory", href: "/team-management", icon: UsersRound, roles: ["associate"], group: "Management" },
  { label: "Score Entry", href: "/scores", icon: BarChart3, roles: ["associate"], group: "Evaluation" },
  { label: "Profile & Settings", href: "/settings", icon: Settings, roles: ["associate"], group: "System" },
];

export function ApplicationShell({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleLinks = role === "admin" ? adminLinks : associateLinks;
  const dashboardHref = role === "admin" ? "/admin/dashboard" : "/associate/dashboard";
  const groupedLinks = visibleLinks.reduce<Record<string, ShellLink[]>>((groups, link) => {
    (groups[link.group] ??= []).push(link);
    return groups;
  }, {});

  return (
    <div className="min-h-screen bg-[#08090B] text-[#F3F1EC]">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[#292D33] bg-[#0D0F12]/95 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-[#292D33] p-2 text-[#9B9EA6] hover:bg-[#171A20] hover:text-white lg:hidden"
            >
              <Menu className="size-5" />
            </button>
            <Link href={dashboardHref} className="flex items-center gap-2 font-display text-sm font-extrabold tracking-wider text-white lg:hidden">
              <span className="size-2 rounded-full bg-[#FF2A1A] animate-pulse" />
              <span>CODERS CLUB CIET</span>
            </Link>
          </div>

          <div className="hidden max-w-md flex-1 items-center rounded-lg border border-[#292D33] bg-[#08090B] px-3 py-2 text-xs text-[#686C74] md:flex lg:ml-4">
            <Search className="mr-2 size-4 text-[#686C74]" />
            <input
              aria-label="Search platform"
              placeholder="Search events, students, attendance sessions... [ / ]"
              className="w-full bg-transparent outline-none placeholder:text-[#686C74] text-[#F3F1EC] text-xs font-mono"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-md border border-[#292D33] bg-[#111318] px-2.5 py-1 text-[11px] font-mono sm:flex">
              <Radio className="size-3 text-[#32C979] animate-pulse" />
              <span className="text-[#9B9EA6]">NODE // </span>
              <span className="text-[#F3F1EC] font-semibold">ONLINE</span>
            </div>

            <div className="flex size-8 items-center justify-center rounded-lg border border-[#FF2A1A]/30 bg-[#FF2A1A]/10 text-xs font-bold font-mono text-[#FF2A1A]">
              {(profile?.displayName || profile?.email || "A").slice(0, 2).toUpperCase()}
            </div>

            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-[#F3F1EC] truncate max-w-[140px]">
                {profile?.displayName || profile?.email || "Account"}
              </p>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="size-1.5 rounded-full bg-[#FF2A1A]" />
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#9B9EA6]">
                  {role}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-[#292D33] bg-[#0D0F12] p-4 text-[#F3F1EC] transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } flex flex-col justify-between`}
      >
        <div>
          {/* Brand Header */}
          <Link href={dashboardHref} className="mb-6 block border-b border-[#292D33] px-3 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg border border-[#FF2A1A]/40 bg-gradient-to-br from-[#FF2A1A]/20 to-[#08090B] text-[#FF2A1A] shadow-[0_0_15px_-3px_rgba(255,42,26,0.3)]">
                <Cpu className="size-5" />
              </div>
              <div>
                <span className="block font-display text-sm font-black tracking-wider text-white">
                  CODERS CLUB
                </span>
                <span className="block font-mono text-[10px] tracking-widest text-[#9B9EA6] uppercase">
                  CIET // OPERATIONS
                </span>
              </div>
            </div>
          </Link>

          <div className="mb-6 flex items-center justify-between lg:hidden">
            <span className="font-mono text-xs font-bold tracking-widest text-[#9B9EA6]">SYSTEM NAVIGATION</span>
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-2 text-[#9B9EA6] hover:bg-[#171A20]"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Grouped Nav */}
          <nav aria-label="Platform navigation" className="space-y-6 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
            {Object.entries(groupedLinks).map(([group, groupLinks]) => (
              <div key={group}>
                <p className="mb-2 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#686C74]">
                  {group}
                </p>
                <div className="space-y-1">
                  {groupLinks.map((link) => {
                    const Icon = link.icon;
                    const active = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                          active
                            ? "border-l-2 border-[#FF2A1A] bg-[#171A20] text-white shadow-[0_0_15px_-4px_rgba(255,42,26,0.25)] font-semibold"
                            : "border-l-2 border-transparent text-[#9B9EA6] hover:bg-[#111318] hover:text-[#F3F1EC]"
                        }`}
                      >
                        <Icon className={`size-4 transition-colors ${active ? "text-[#FF2A1A]" : "text-[#686C74] group-hover:text-[#9B9EA6]"}`} />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer Account Status */}
        <div className="border-t border-[#292D33] pt-4 mt-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-[#292D33] bg-[#111318] p-2.5">
            <div className="flex size-8 items-center justify-center rounded border border-[#FF2A1A]/30 bg-[#08090B] font-mono text-xs font-bold text-[#FF2A1A]">
              {(profile?.displayName || profile?.email || "A").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[#F3F1EC]">
                {profile?.displayName || profile?.email || "Account"}
              </p>
              <p className="font-mono text-[10px] uppercase text-[#686C74]">
                ROLE: <span className="text-[#FF2A1A]">{role}</span>
              </p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="lg:pl-72">
        <main className="p-6 sm:p-8 lg:p-12 max-w-7xl mx-auto space-y-12">{children}</main>
      </div>
    </div>
  );
}
