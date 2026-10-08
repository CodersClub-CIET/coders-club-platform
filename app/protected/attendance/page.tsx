"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AttendanceSession } from "@/lib/attendance/types";
import { attendanceService } from "@/lib/attendance/attendance-service";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusIndicator, CyberCard, MetricCard } from "@/components/ui/cyberpunk";
import QRDisplayModal from "@/components/attendance/qr-display-modal";
import LiveMonitorModal from "@/components/attendance/live-monitor-modal";
import CreateSessionModal from "@/components/attendance/create-session-modal";
import ODReportModal from "@/components/attendance/od-report-modal";
import AttendanceAnalyticsView from "@/components/attendance/attendance-analytics-view";
import StudentLookupView from "@/components/attendance/student-lookup-view";
import CoordinatorAttendanceView from "@/components/attendance/coordinator-attendance-view";
import DatabaseStatusBanner from "@/components/attendance/database-status-banner";
import {
  Activity,
  BarChart3,
  Briefcase,
  Calendar,
  CheckCircle,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  GraduationCap,
  Home as HomeIcon,
  Plus,
  QrCode,
  Radio,
  Search,
  StopCircle,
  Sun,
  Moon,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";

export default function AttendanceManagementPage() {
  const [activeTab, setActiveTab] = useState<"sessions" | "coordinators" | "analytics" | "lookup">("sessions");
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<"all" | "morning" | "afternoon">("all");

  // Modals state
  const [activeQRModalSession, setActiveQRModalSession] = useState<AttendanceSession | null>(null);
  const [activeMonitorSession, setActiveMonitorSession] = useState<AttendanceSession | null>(null);
  const [activeODSession, setActiveODSession] = useState<AttendanceSession | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSessions() {
      try {
        setLoading(true);
        const data = await attendanceService.getSessions();
        if (isMounted) {
          setSessions(data);
          setLoading(false);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    }

    loadSessions();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleEndSession = async (sessionId: string) => {
    try {
      const updated = await attendanceService.endSession(sessionId);
      setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to end session.");
    }
  };

  const handleDownloadCSV = async (sessionId: string) => {
    try {
      await attendanceService.downloadSessionCSV(sessionId);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to download attendance sheet.");
    }
  };

  const handleDeleteSession = async (sessionId: string, sessionName: string) => {
    if (!confirm(`Are you sure you want to delete session "${sessionName}" and all its records?`)) {
      return;
    }
    try {
      await attendanceService.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete session.");
    }
  };

  const handleSessionCreated = (newSession: AttendanceSession) => {
    setSessions((prev) => [newSession, ...prev]);
    // Automatically open the QR modal for the newly started session!
    setActiveQRModalSession(newSession);
  };

  // Metrics
  const activeCount = sessions.filter((s) => s.isActive).length;
  const morningCount = sessions.filter((s) => s.period === "morning").length;
  const afternoonCount = sessions.filter((s) => s.period === "afternoon").length;

  const filteredSessions = sessions.filter((s) => {
    const matchesPeriod = filterPeriod === "all" || s.period === filterPeriod;
    const matchesSearch =
      s.sessionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.eventName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPeriod && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          moduleCode="OPS // 01" 
          category="ATTENDANCE" 
          title="Attendance Management" 
          description="Record and manage event attendance."
          icon={ClipboardCheck} 
        />
        <Button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="bg-[#FF2A1A] hover:bg-[#C51D16] text-white font-semibold py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center gap-2"
        >
          <Plus className="size-4" />
          Start New Session
        </Button>
      </div>

      <DatabaseStatusBanner />

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#292D33] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("sessions")}
          className={`flex items-center gap-2 transition-all ${
            activeTab === "sessions"
              ? "bg-[#FF2A1A] text-white font-mono text-[11px] uppercase tracking-wider px-4 py-2 rounded-lg"
              : "border border-[#292D33] text-[#9B9EA6] font-mono text-[11px] uppercase px-4 py-2 rounded-lg hover:border-[#3A3E45]"
          }`}
        >
          <Calendar className="size-3.5" />
          <span>Sessions ({sessions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("coordinators")}
          className={`flex items-center gap-2 transition-all ${
            activeTab === "coordinators"
              ? "bg-[#FF2A1A] text-white font-mono text-[11px] uppercase tracking-wider px-4 py-2 rounded-lg"
              : "border border-[#292D33] text-[#9B9EA6] font-mono text-[11px] uppercase px-4 py-2 rounded-lg hover:border-[#3A3E45]"
          }`}
        >
          <Briefcase className="size-3.5" />
          <span>Coordinator Attendance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 transition-all ${
            activeTab === "analytics"
              ? "bg-[#FF2A1A] text-white font-mono text-[11px] uppercase tracking-wider px-4 py-2 rounded-lg"
              : "border border-[#292D33] text-[#9B9EA6] font-mono text-[11px] uppercase px-4 py-2 rounded-lg hover:border-[#3A3E45]"
          }`}
        >
          <BarChart3 className="size-3.5" />
          <span>Analytics &amp; Insights</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("lookup")}
          className={`flex items-center gap-2 transition-all ${
            activeTab === "lookup"
              ? "bg-[#FF2A1A] text-white font-mono text-[11px] uppercase tracking-wider px-4 py-2 rounded-lg"
              : "border border-[#292D33] text-[#9B9EA6] font-mono text-[11px] uppercase px-4 py-2 rounded-lg hover:border-[#3A3E45]"
          }`}
        >
          <GraduationCap className="size-3.5" />
          <span>Student Lookup</span>
        </button>
      </div>

      {/* Conditional Views */}
          {activeTab === "sessions" && (
            <>
              {/* Editorial Numerical Typography Strip */}
              <div className="border-y border-[#292D33] py-8 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-8 divide-y sm:divide-y-0 sm:divide-x divide-[#292D33]">
                <div className="space-y-1">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9B9EA6]">
                    01 // ACTIVE SESSIONS
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-numeric-huge text-[#F3F1EC]">{String(activeCount).padStart(2, "0")}</span>
                    {activeCount > 0 && <span className="font-mono text-xs text-[#32C979] font-medium">LIVE</span>}
                  </div>
                  <p className="font-mono text-xs text-[#686C74]">Accepting verified scans now</p>
                </div>

                <div className="space-y-1 sm:pl-8 pt-4 sm:pt-0">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9B9EA6]">
                    02 // MORNING PERIOD
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-numeric-huge text-[#F3F1EC]">{String(morningCount).padStart(2, "0")}</span>
                  </div>
                  <p className="font-mono text-xs text-[#686C74]">Tracked morning operations</p>
                </div>

                <div className="space-y-1 sm:pl-8 pt-4 sm:pt-0">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9B9EA6]">
                    03 // AFTERNOON PERIOD
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-numeric-huge text-[#F3F1EC]">{String(afternoonCount).padStart(2, "0")}</span>
                  </div>
                  <p className="font-mono text-xs text-[#686C74]">Tracked afternoon operations</p>
                </div>
              </div>

      {/* Filter and Search Bar */}
      <div className="max-w-7xl mx-auto mb-6 bg-[#111318] p-4 rounded-2xl border border-[#292D33] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 size-4 text-[#686C74]" />
          <input
            type="text"
            placeholder="Search by session or event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#08090B] border border-[#292D33] rounded-lg text-[#F3F1EC] placeholder-slate-400 focus:outline-none focus:bg-[#111318] focus:border-indigo-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterPeriod("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterPeriod === "all"
                ? "bg-[#F3F1EC] text-white"
                : "bg-[#171A20] text-[#9B9EA6] hover:bg-[#1D2026]"
            }`}
          >
            All Periods
          </button>
          <button
            type="button"
            onClick={() => setFilterPeriod("morning")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterPeriod === "morning"
                ? "bg-amber-600 text-white"
                : "bg-[#171A20] text-[#9B9EA6] hover:bg-[#1D2026]"
            }`}
          >
            <Sun className="size-3.5" />
            Morning
          </button>
          <button
            type="button"
            onClick={() => setFilterPeriod("afternoon")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterPeriod === "afternoon"
                ? "bg-[#FF2A1A] text-white"
                : "bg-[#171A20] text-[#9B9EA6] hover:bg-[#1D2026]"
            }`}
          >
            <Moon className="size-3.5" />
            Afternoon
          </button>
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="bg-[#111318] rounded-2xl border border-[#292D33] p-12 text-center flex flex-col items-center gap-3">
            <div className="size-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
            <p className="text-xs text-[#686C74]">Loading attendance sessions...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-[#111318] rounded-2xl border border-[#292D33] p-12 text-center">
            <div className="p-3 rounded-full bg-[#171A20] text-[#686C74] w-fit mx-auto mb-3">
              <Calendar className="size-6" />
            </div>
            <h3 className="text-base font-bold text-[#F3F1EC]">No Attendance Sessions Found</h3>
            <p className="text-xs text-[#686C74] mt-1 max-w-sm mx-auto">
              Start an attendance session for an event or workshop to generate QR codes and accept attendee scans.
            </p>
            <Button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="mt-4 bg-[#FF2A1A] text-white text-xs font-semibold"
            >
              Start First Session
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className="bg-[#111318] rounded-2xl border border-[#292D33] shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Status & Period Row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        session.period === "morning"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {session.period === "morning" ? <Sun className="size-3" /> : <Moon className="size-3" />}
                      {session.period} Period
                    </span>

                    {session.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        <StatusIndicator status="processing" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#171A20] text-[#9B9EA6]">
                        <CheckCircle className="size-3" />
                        Closed
                      </span>
                    )}
                  </div>

                  {/* Title & Event */}
                  <h3 className="text-base font-bold text-[#F3F1EC] line-clamp-1">{session.sessionName}</h3>
                  <p className="text-xs font-medium text-[#FF2A1A] mt-0.5 line-clamp-1">{session.eventName}</p>
                  {session.subEventName && (
                    <p className="text-[11px] text-[#686C74] line-clamp-1">Track: {session.subEventName}</p>
                  )}

                  {/* Metadata */}
                  <div className="mt-4 pt-3 border-t border-[#292D33] space-y-1 text-xs text-[#686C74]">
                    <div className="flex items-center justify-between">
                      <span>Started:</span>
                      <span className="font-mono text-[#9B9EA6]">
                        {new Date(session.startsAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {session.endsAt && (
                      <div className="flex items-center justify-between">
                        <span>Ended:</span>
                        <span className="font-mono text-[#9B9EA6]">
                          {new Date(session.endsAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-3 border-t border-[#292D33] space-y-2">
                  {/* Primary Row: QR & Live Feed */}
                  <div className={session.isActive ? "grid grid-cols-2 gap-2" : "flex"}>
                    {session.isActive && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setActiveQRModalSession(session)}
                        className="bg-[#FF2A1A] hover:bg-[#C51D16] text-white text-xs font-semibold gap-1.5 w-full shadow-sm"
                      >
                        <QrCode className="size-3.5" />
                        Show QR
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveMonitorSession(session)}
                      className={`text-xs font-medium text-[#9B9EA6] gap-1.5 hover:bg-[#08090B] ${
                        session.isActive ? "w-full" : "w-full"
                      }`}
                    >
                      <Users className="size-3.5 text-[#FF2A1A]" />
                      Live Feed
                    </Button>
                  </div>

                  {/* Secondary Row: CSV, OD Report, End, Delete */}
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#292D33]">
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadCSV(session.id)}
                        className="h-8 px-2 text-[11px] font-medium text-[#9B9EA6] gap-1 hover:bg-[#08090B]"
                        title="Download CSV attendance sheet for OD / college records"
                      >
                        <Download className="size-3 text-[#FF2A1A]" />
                        CSV
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveODSession(session)}
                        className="h-8 px-2 text-[11px] font-medium text-[#9B9EA6] gap-1 hover:bg-[#08090B]"
                        title="Generate Official On-Duty (OD) Sheet for HODs/Faculty"
                      >
                        <FileText className="size-3 text-[#FF2A1A]" />
                        OD Report
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      {session.isActive && (
                        <button
                          type="button"
                          onClick={() => handleEndSession(session.id)}
                          className="h-8 px-2 text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 border border-rose-200"
                          title="End this session"
                        >
                          <StopCircle className="size-3" />
                          End
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteSession(session.id, session.sessionName)}
                        className="h-8 w-8 flex items-center justify-center text-[#686C74] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete session"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )}

  {activeTab === "coordinators" && (
    <div className="max-w-7xl mx-auto">
      <CoordinatorAttendanceView />
    </div>
  )}

  {activeTab === "analytics" && (
    <div className="max-w-7xl mx-auto">
      <AttendanceAnalyticsView />
    </div>
  )}

  {activeTab === "lookup" && (
    <div className="max-w-7xl mx-auto">
      <StudentLookupView />
    </div>
  )}

      {/* QR Display Modal */}
      {activeQRModalSession && (
        <QRDisplayModal
          session={activeQRModalSession}
          onClose={() => setActiveQRModalSession(null)}
        />
      )}

      {/* Live Monitor Modal */}
      {activeMonitorSession && (
        <LiveMonitorModal
          session={activeMonitorSession}
          onClose={() => setActiveMonitorSession(null)}
        />
      )}

      {/* Official On-Duty (OD) Report Modal */}
      {activeODSession && (
        <ODReportModal
          session={activeODSession}
          isOpen={!!activeODSession}
          onClose={() => setActiveODSession(null)}
        />
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <CreateSessionModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleSessionCreated}
        />
      )}
    </div>
  );
}
