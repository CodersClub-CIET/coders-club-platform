"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, ClipboardCheck, RefreshCw, UsersRound, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/use-auth";
import { LargeNumericBlock } from "@/components/ui/cyberpunk";

type AssignedEvent = {
  id: string;
  name: string;
  attendanceAccess: boolean;
  assignedAt: string;
};

type DashboardState =
  | { status: "loading"; events: AssignedEvent[]; error: null }
  | { status: "ready"; events: AssignedEvent[]; error: null }
  | { status: "error"; events: AssignedEvent[]; error: string };

export default function AssociateDashboard() {
  const { user, profile } = useAuth();
  const [state, setState] = useState<DashboardState>({ status: "loading", events: [], error: null });
  const displayName = profile?.displayName || profile?.email || "Associate";

  async function loadAssignments() {
    if (!user) return;
    setState((current) => ({ ...current, status: "loading", error: null }));

    try {
      const supabase = createClient();
      const { data: associate, error: associateError } = await supabase
        .from("associates")
        .select("id")
        .eq("auth_user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (associateError) throw new Error(associateError.message);
      if (!associate) {
        setState({ status: "ready", events: [], error: null });
        return;
      }

      const { data: allocations, error: allocationError } = await supabase
        .from("associate_allocations")
        .select("event_node_id, attendance_access, assigned_at")
        .eq("associate_id", associate.id)
        .eq("is_active", true)
        .order("assigned_at", { ascending: false });

      if (allocationError) throw new Error(allocationError.message);

      const eventIds = [...new Set((allocations ?? []).map((allocation) => allocation.event_node_id))];
      if (eventIds.length === 0) {
        setState({ status: "ready", events: [], error: null });
        return;
      }

      const { data: eventNodes, error: eventError } = await supabase
        .from("event_nodes")
        .select("id, name")
        .in("id", eventIds)
        .eq("is_active", true);

      if (eventError) throw new Error(eventError.message);

      const names = new Map((eventNodes ?? []).map((event) => [event.id, event.name]));
      const events = (allocations ?? [])
        .filter((allocation) => names.has(allocation.event_node_id))
        .map((allocation) => ({
          id: allocation.event_node_id,
          name: names.get(allocation.event_node_id) ?? "Assigned event",
          attendanceAccess: Boolean(allocation.attendance_access),
          assignedAt: allocation.assigned_at,
        }));

      setState({ status: "ready", events, error: null });
    } catch (error) {
      console.error("Associate dashboard assignments error:", error);
      setState({
        status: "error",
        events: [],
        error: "Unable to load your assigned activities. Try again.",
      });
    }
  }

  useEffect(() => {
    void loadAssignments();
  }, [user?.id]);

  const attendanceEnabled = useMemo(
    () => state.events.filter((event) => event.attendanceAccess).length,
    [state.events],
  );

  return (
    <div className="space-y-12">
      {/* Editorial Header Section directly on dark workspace */}
      <header className="relative pb-8 sm:pb-10 border-b border-[#292D33] space-y-4">
        <div className="absolute -top-3 left-0 w-16 h-[2px] bg-[#FF2A1A]" />
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-2">
          <div className="space-y-3 max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-semibold tracking-[0.2em] text-[#FF2A1A] uppercase">
                OPERATIONS // {displayName.toUpperCase()}
              </span>
              <span className="text-[#3A3E45] font-mono">/</span>
              <span className="font-mono text-xs text-[#9B9EA6] tracking-wider uppercase">
                COORDINATOR DECK
              </span>
            </div>

            <h1 className="font-display-hero text-[#F3F1EC] tracking-tighter">
              Operations <br className="hidden sm:inline" />
              Workspace.
            </h1>

            <p className="text-base text-[#9B9EA6] max-w-xl font-normal leading-relaxed pt-1">
              Welcome back, <span className="text-[#F3F1EC] font-medium">{displayName}</span>. Here is your operational roster and assigned events requiring action today.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadAssignments()}
              className="inline-flex items-center gap-2 border border-[#292D33] bg-[#0D0F12] px-4 py-2 font-mono text-xs text-[#9B9EA6] hover:text-[#F3F1EC] hover:border-[#3A3E45] transition-colors rounded"
            >
              <RefreshCw className="size-3.5" />
              <span>SYNC ROSTER</span>
            </button>
          </div>
        </div>
      </header>

      {/* Large Typographic Data Strip (No Cards!) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#292D33] pb-2">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#9B9EA6]">
            ALLOCATION METRICS // OPERATIONAL STATUS
          </h2>
          <span className="font-mono text-[10px] text-[#686C74] uppercase tracking-wider">
            AUTHORITATIVE ASSIGNMENTS
          </span>
        </div>

        <div className="border-y border-[#292D33] py-8 grid grid-cols-1 sm:grid-cols-3 gap-8 divide-y sm:divide-y-0 sm:divide-x divide-[#292D33]">
          <LargeNumericBlock
            label="01 // ALLOCATED EVENTS"
            value={state.status === "ready" ? String(state.events.length).padStart(2, "0") : "—"}
            subtext="Event pipelines assigned to your profile"
          />

          <LargeNumericBlock
            label="02 // ATTENDANCE ACCESS"
            value={state.status === "ready" ? String(attendanceEnabled).padStart(2, "0") : "—"}
            subtext="Sessions with active QR & check-in rights"
            className="sm:pl-8 pt-4 sm:pt-0"
          />

          <LargeNumericBlock
            label="03 // STATUS PROTOCOL"
            value="ACTIVE"
            subtext="Verified coordinator credential active"
            trend="READY"
            className="sm:pl-8 pt-4 sm:pt-0"
          />
        </div>
      </section>

      {/* Error Banner */}
      {state.status === "error" && (
        <div
          role="alert"
          className="flex items-center justify-between border border-[#FF2A1A]/30 bg-[#FF2A1A]/5 p-5 text-sm text-[#FF2A1A] rounded"
        >
          <span>{state.error}</span>
          <button
            type="button"
            onClick={() => void loadAssignments()}
            className="inline-flex items-center gap-2 font-mono text-xs font-semibold hover:underline"
          >
            <RefreshCw className="size-4" /> Try again
          </button>
        </div>
      )}

      {/* Asymmetric Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column (8 cols): My Assigned Events as an Editorial Roster */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between border-b border-[#292D33] pb-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FF2A1A]">
                DUTY ROSTER
              </p>
              <h3 className="font-display text-2xl font-light text-[#F3F1EC] tracking-tight mt-0.5">
                My Assigned Events
              </h3>
            </div>
            <Link
              href="/event-management"
              className="font-mono text-xs text-[#9B9EA6] hover:text-[#FF2A1A] transition-colors flex items-center gap-1"
            >
              <span>EXPLORE ALL</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>

          {state.status === "loading" && (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse bg-[#111318] border border-[#292D33]" />
              ))}
            </div>
          )}

          {state.status === "ready" && state.events.length === 0 && (
            <div className="py-16 text-center border-b border-[#292D33] space-y-2">
              <CalendarDays className="mx-auto size-7 text-[#686C74]" />
              <p className="font-display text-lg font-light text-[#F3F1EC]">No Active Event Allocations</p>
              <p className="font-mono text-xs text-[#686C74] max-w-md mx-auto">
                You have not been assigned to any upcoming events yet. Reach out to the club administrator for allocation.
              </p>
            </div>
          )}

          {state.status === "ready" && state.events.length > 0 && (
            <div className="divide-y divide-[#292D33] border-b border-[#292D33]">
              {state.events.map((event, idx) => (
                <div
                  key={event.id}
                  className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-5 px-3 hover:bg-[#0D0F12] transition-colors"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#FF2A1A] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-[#686C74]">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <h4 className="font-display text-lg font-normal text-[#F3F1EC] group-hover:text-white transition-colors">
                        {event.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-4 font-mono text-xs text-[#9B9EA6] pl-7">
                      <span>Assigned: {new Date(event.assignedAt).toLocaleDateString()}</span>
                      <span>&bull;</span>
                      <span className={event.attendanceAccess ? "text-[#32C979]" : "text-[#686C74]"}>
                        {event.attendanceAccess ? "Attendance Enabled" : "Read-Only"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-7 sm:pl-0">
                    {event.attendanceAccess && (
                      <Link
                        href="/attendance"
                        className="rounded border border-[#292D33] bg-[#08090B] px-3 py-1.5 font-mono text-xs text-[#F3F1EC] hover:border-[#FF2A1A]/50 hover:text-white transition-colors"
                      >
                        RUN ATTENDANCE
                      </Link>
                    )}
                    <Link
                      href="/event-management"
                      className="rounded border border-[#292D33] p-1.5 text-[#686C74] hover:text-[#F3F1EC] hover:border-[#3A3E45] transition-colors"
                    >
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Quick Operations */}
        <div className="lg:col-span-4 space-y-4">
          <div className="border-b border-[#292D33] pb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FF2A1A]">
              OPERATIONS DECK
            </p>
            <h3 className="font-display text-2xl font-light text-[#F3F1EC] tracking-tight mt-0.5">
              Quick Actions
            </h3>
          </div>

          <div className="space-y-2">
            {[
              {
                title: "Live Attendance Console",
                desc: "Record check-ins and run live sessions",
                href: "/attendance",
                icon: ClipboardCheck,
              },
              {
                title: "Dynamic QR Protocol",
                desc: "Launch scannable station for students",
                href: "/dynamic-qr",
                icon: CalendarDays,
              },
              {
                title: "Score Entry Grid",
                desc: "Submit performance marks for rounds",
                href: "/scores",
                icon: ArrowUpRight,
              },
              {
                title: "Teams Directory",
                desc: "Review member rosters and standings",
                href: "/team-management",
                icon: UsersRound,
              },
            ].map((action) => {
              const ActionIcon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center justify-between p-4 border border-[#292D33] bg-[#0D0F12] hover:bg-[#111318] hover:border-[#3A3E45] transition-all"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-[#F3F1EC] group-hover:text-[#FF2A1A] transition-colors">
                      {action.title}
                    </p>
                    <p className="text-[11px] text-[#686C74] font-mono leading-tight">
                      {action.desc}
                    </p>
                  </div>
                  <ActionIcon className="size-4 text-[#686C74] group-hover:text-[#FF2A1A] transition-colors shrink-0 ml-2" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
