"use client";

import {
  Activity,
  BarChart3,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  Settings,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/use-auth";
import type { UserRole } from "@/lib/auth/types";

type DashboardModule = {
  code: string;
  label: string;
  description: string;
  href: string;
  icon: typeof Activity;
  roles: readonly UserRole[];
};

const modules: readonly DashboardModule[] = [
  {
    code: "OPS // 01",
    label: "Manage Attendance",
    description: "Run live attendance sessions, launch dynamic QR stations, and verify check-ins.",
    href: "/attendance",
    icon: ClipboardCheck,
    roles: ["admin", "associate"],
  },
  {
    code: "OPS // 02",
    label: "Manage Events",
    description: "Create and coordinate institutional events, rounds, schedules, and active pipelines.",
    href: "/event-management",
    icon: CalendarDays,
    roles: ["admin", "associate"],
  },
  {
    code: "OPS // 03",
    label: "Manage Teams",
    description: "Organize teams, member rosters, balances, and assigned activity tracks.",
    href: "/team-management",
    icon: UsersRound,
    roles: ["admin", "associate"],
  },
  {
    code: "DATA // 01",
    label: "Manage Students",
    description: "Search student records, enrollment statuses, and verify academic profiles.",
    href: "/search-filtering",
    icon: GraduationCap,
    roles: ["admin"],
  },
  {
    code: "ADM // 01",
    label: "Manage Associates",
    description: "Review access requests, onboard coordinators, and manage event allocations.",
    href: "/associates",
    icon: Users,
    roles: ["admin"],
  },
  {
    code: "EVAL // 01",
    label: "Manage Scores",
    description: "Record and validate student event performance marks and criteria.",
    href: "/scores",
    icon: BarChart3,
    roles: ["admin", "associate"],
  },
  {
    code: "EVAL // 02",
    label: "View Reports",
    description: "Export comprehensive attendance, performance, and associate duty sheets.",
    href: "/reports",
    icon: Activity,
    roles: ["admin", "associate"],
  },
  {
    code: "SYS // 01",
    label: "Configure Platform",
    description: "Manage system configurations, environment settings, and administrator controls.",
    href: "/protected/configure",
    icon: Settings,
    roles: ["admin"],
  },
];

export default function RoleDashboard() {
  const { profile, role } = useAuth();
  const visibleModules = modules.filter((module) => role && module.roles.includes(role));
  const displayName = profile?.displayName || profile?.email || "Coordinator";
  const roleLabel = role === "admin" ? "Administrator" : "Associate";

  return (
    <div className="space-y-12">
      {/* Editorial Workspace Header */}
      <header className="relative pb-8 sm:pb-10 border-b border-[#292D33] space-y-4">
        <div className="absolute -top-3 left-0 w-16 h-[2px] bg-[#FF2A1A]" />
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-2">
          <div className="space-y-3 max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-semibold tracking-[0.2em] text-[#FF2A1A] uppercase">
                WORKSPACE // {roleLabel.toUpperCase()}
              </span>
              <span className="text-[#3A3E45] font-mono">/</span>
              <span className="font-mono text-xs text-[#9B9EA6] tracking-wider uppercase">
                OPERATIONAL CONSOLE
              </span>
            </div>

            <h1 className="font-display-hero text-[#F3F1EC] tracking-tighter">
              Welcome back, <br className="hidden sm:inline" />
              {displayName}.
            </h1>

            <p className="text-base text-[#9B9EA6] max-w-xl font-normal leading-relaxed pt-1">
              {role === "admin"
                ? "Manage the complete Coders Club institutional platform from this central command center."
                : "Access your authorized operational modules and execute assigned activity duties."}
            </p>
          </div>

          <div className="shrink-0 pb-1">
            <span className="font-mono text-xs border border-[#292D33] bg-[#0D0F12] text-[#9B9EA6] px-3.5 py-1.5 rounded">
              {visibleModules.length} MODULES READY
            </span>
          </div>
        </div>
      </header>

      {/* Editorial Module Directory (Minimalist hairline grid) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#292D33] pb-3">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[#9B9EA6]">
            AUTHORIZED MODULES // WORKSPACE DIRECTORY
          </h2>
          <span className="font-mono text-[10px] text-[#686C74] uppercase tracking-wider">
            RBAC VERIFIED
          </span>
        </div>

        <nav
          aria-label="Dashboard modules"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2"
        >
          {visibleModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.href}
                href={module.href}
                className="group relative border border-[#292D33] bg-[#0D0F12] p-6 hover:bg-[#111318] hover:border-[#3A3E45] transition-all flex flex-col justify-between min-h-[170px]"
              >
                <div className="absolute top-0 left-0 w-8 h-[2px] bg-[#FF2A1A] opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FF2A1A]">
                    {module.code}
                  </span>
                  <div className="flex size-7 items-center justify-center rounded border border-[#292D33] bg-[#08090B] text-[#9B9EA6] group-hover:border-[#FF2A1A]/40 group-hover:text-[#FF2A1A] transition-colors">
                    <Icon className="size-3.5" />
                  </div>
                </div>

                <div className="space-y-1.5 my-3">
                  <h3 className="font-display text-lg font-light text-[#F3F1EC] group-hover:text-white transition-colors">
                    {module.label}
                  </h3>
                  <p className="text-xs text-[#9B9EA6] font-normal leading-relaxed">
                    {module.description}
                  </p>
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-[#292D33]/60">
                  <span className="font-mono text-[10px] uppercase text-[#686C74] group-hover:text-[#FF2A1A] transition-colors flex items-center gap-1">
                    LAUNCH <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </section>
    </div>
  );
}
