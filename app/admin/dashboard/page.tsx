"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  PageHeader,
  StatusIndicator,
  LargeNumericBlock,
} from "@/components/ui/cyberpunk";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardCheck,
  Grid2X2,
  UsersRound,
  BarChart3,
  ArrowRight,
  Clock,
} from "lucide-react";
import { ManagementGuard } from "@/components/auth/management-guard";

interface RecentRequest {
  id: string;
  full_name: string;
  email: string;
  department?: string;
  created_at: string;
  status: string;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState({
    associates: 0,
    pendingRequests: 0,
    activeEvents: 0,
    todaySessions: 0,
  });
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      const supabase = createClient();

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);

      const [
        { count: associatesCount },
        { count: pendingCount },
        { count: eventsCount },
        { count: sessionsCount },
        { data: recentReqs },
      ] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "associate")
          .eq("is_active", true),
        supabase
          .from("associate_access_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("event_nodes")
          .select("*", { count: "exact", head: true })
          .in("status", ["published", "ongoing"])
          .is("parent_id", null),
        supabase
          .from("attendance_sessions")
          .select("*", { count: "exact", head: true })
          .gte("started_at", todayStart.toISOString())
          .lt("started_at", tomorrowStart.toISOString()),
        supabase
          .from("associate_access_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      setMetrics({
        associates: associatesCount || 0,
        pendingRequests: pendingCount || 0,
        activeEvents: eventsCount || 0,
        todaySessions: sessionsCount || 0,
      });
      setRecentRequests(recentReqs || []);
      setLoading(false);
    }

    fetchDashboardData();
  }, []);

  return (
    <ManagementGuard allowedRoles={["admin"]}>
      <div className="space-y-12">
        {/* Editorial Page Header directly on dark workspace */}
        <PageHeader
          moduleCode="ADM // 01"
          category="COMMAND CENTER"
          title="Command Center"
          description="Manage institutional operations, associate credentials, event pipelines, and real-time attendance streams."
          icon={LayoutDashboard}
          badge="OPERATIONAL"
          action={
            <Link
              href="/event-management"
              className="inline-flex items-center gap-2 border border-[#292D33] bg-[#0D0F12] px-4 py-2 font-mono text-xs font-medium text-[#F3F1EC] hover:border-[#FF2A1A]/50 hover:bg-[#111318] transition-colors rounded"
            >
              <span>DISPATCH NEW EVENT</span>
              <ArrowRight className="size-3.5 text-[#FF2A1A]" />
            </Link>
          }
        />

        {/* Section 1: ACTIVE OPERATIONS (Large Typographic Data Strip - No Cards!) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#292D33] pb-2">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#9B9EA6]">
              ACTIVE OPERATIONS // REAL-TIME METRICS
            </h2>
            <span className="font-mono text-[10px] text-[#686C74] uppercase tracking-wider">
              AUTO-SYNCED
            </span>
          </div>

          <div className="border-y border-[#292D33] py-8 grid grid-cols-2 lg:grid-cols-4 gap-8 divide-y lg:divide-y-0 lg:divide-x divide-[#292D33]">
            <LargeNumericBlock
              label="01 // ACTIVE EVENTS"
              value={loading ? "—" : String(metrics.activeEvents).padStart(2, "0")}
              subtext="Published & ongoing round pipelines"
              trend={metrics.activeEvents > 0 ? "LIVE" : undefined}
            />

            <LargeNumericBlock
              label="02 // TODAY'S SESSIONS"
              value={loading ? "—" : String(metrics.todaySessions).padStart(2, "0")}
              subtext="Attendance session records created today"
              className="lg:pl-8 pt-4 lg:pt-0"
            />

            <LargeNumericBlock
              label="03 // ACTIVE ASSOCIATES"
              value={loading ? "—" : String(metrics.associates).padStart(2, "0")}
              subtext="Coordinators with verified role access"
              className="lg:pl-8 pt-4 lg:pt-0"
            />

            <LargeNumericBlock
              label="04 // PENDING ACCESS"
              value={loading ? "—" : String(metrics.pendingRequests).padStart(2, "0")}
              subtext="Awaiting administrator decision"
              trend={metrics.pendingRequests > 0 ? "ACTION REQ" : undefined}
              className="lg:pl-8 pt-4 lg:pt-0"
            />
          </div>
        </section>

        {/* Section 2: Asymmetric Layout: Recent Activity List (8 cols) & Quick Operations (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Recent Access Requests (Editorial Timeline List) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[#292D33] pb-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FF2A1A]">
                  AUDIT STREAM
                </p>
                <h3 className="font-display text-2xl font-light text-[#F3F1EC] tracking-tight mt-0.5">
                  Recent Access Requests
                </h3>
              </div>
              <Link
                href="/associate-requests"
                className="font-mono text-xs text-[#9B9EA6] hover:text-[#FF2A1A] transition-colors flex items-center gap-1"
              >
                <span>VIEW ALL</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-4 py-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse bg-[#111318] border border-[#292D33]" />
                ))}
              </div>
            ) : recentRequests.length === 0 ? (
              <div className="py-12 text-center border-b border-[#292D33]">
                <Clock className="size-6 text-[#686C74] mx-auto mb-2" />
                <p className="font-mono text-xs text-[#686C74]">No access requests in audit stream.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#292D33] border-b border-[#292D33]">
                {recentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-2 hover:bg-[#0D0F12] transition-colors"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#FF2A1A] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-[#F3F1EC] text-sm tracking-tight">
                          {req.full_name}
                        </span>
                        <StatusIndicator
                          status={
                            req.status === "pending"
                              ? "pending"
                              : req.status === "approved"
                              ? "active"
                              : "revoked"
                          }
                        />
                      </div>
                      <p className="font-mono text-xs text-[#9B9EA6]">
                        {req.email} &bull; {req.department || "General"}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono text-[#686C74]">
                      <span>{new Date(req.created_at).toLocaleDateString()}</span>
                      <Link
                        href="/associate-requests"
                        className="rounded border border-[#292D33] px-2.5 py-1 text-[11px] text-[#9B9EA6] hover:border-[#FF2A1A]/40 hover:text-[#F3F1EC] transition-colors"
                      >
                        REVIEW
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Quick Operations Command Console */}
          <div className="lg:col-span-4 space-y-4">
            <div className="border-b border-[#292D33] pb-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FF2A1A]">
                COMMAND SHORTCUTS
              </p>
              <h3 className="font-display text-2xl font-light text-[#F3F1EC] tracking-tight mt-0.5">
                Quick Operations
              </h3>
            </div>

            <div className="space-y-2">
              {[
                {
                  label: "Event Operations",
                  desc: "Configure events, rounds, and schedules",
                  href: "/event-management",
                  icon: CalendarDays,
                },
                {
                  label: "Attendance Station",
                  desc: "Monitor live check-in sessions",
                  href: "/attendance",
                  icon: ClipboardCheck,
                },
                {
                  label: "Dynamic QR Protocol",
                  desc: "Rotate anti-replay challenge nonces",
                  href: "/dynamic-qr",
                  icon: Grid2X2,
                },
                {
                  label: "Resource Allocation",
                  desc: "Assign associates to event duties",
                  href: "/associate-allocation",
                  icon: UsersRound,
                },
                {
                  label: "Score Evaluation",
                  desc: "Audit participant performance marks",
                  href: "/scores",
                  icon: BarChart3,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center justify-between p-4 border border-[#292D33] bg-[#0D0F12] hover:bg-[#111318] hover:border-[#3A3E45] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded border border-[#292D33] bg-[#08090B] text-[#9B9EA6] group-hover:border-[#FF2A1A]/50 group-hover:text-[#FF2A1A] transition-colors">
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#F3F1EC] tracking-tight group-hover:text-[#FF2A1A] transition-colors">
                          {item.label}
                        </p>
                        <p className="text-[11px] text-[#686C74] font-mono leading-tight">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="size-3.5 text-[#686C74] group-hover:translate-x-1 group-hover:text-[#FF2A1A] transition-all" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </ManagementGuard>
  );
}
