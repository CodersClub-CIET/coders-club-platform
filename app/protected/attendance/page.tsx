"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AttendanceSession } from "@/lib/attendance/types";
import { attendanceService } from "@/lib/attendance/attendance-service";
import { Button } from "@/components/ui/button";
import QRDisplayModal from "@/components/attendance/qr-display-modal";
import LiveMonitorModal from "@/components/attendance/live-monitor-modal";
import CreateSessionModal from "@/components/attendance/create-session-modal";
import ODReportModal from "@/components/attendance/od-report-modal";
import AttendanceAnalyticsView from "@/components/attendance/attendance-analytics-view";
import StudentLookupView from "@/components/attendance/student-lookup-view";
import {
  Activity,
  BarChart3,
  Calendar,
  CheckCircle,
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
  const [activeTab, setActiveTab] = useState<"sessions" | "analytics" | "lookup">("sessions");
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div>
        {/* Top Global Navigation Bar */}
        <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-30 mb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
                <QrCode className="size-5" />
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-tight text-slate-900 block">
                  Coders Club CIET
                </span>
                <span className="text-[10px] text-slate-500 block -mt-0.5">
                  Autonomous Institution &bull; Anna University
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/"
                className="text-xs font-semibold text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <HomeIcon className="size-3.5" />
                <span>Home</span>
              </Link>
              <Link
                href="/attendance"
                className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Activity className="size-3.5" />
                <span>Attendance</span>
              </Link>
              <Link
                href="/attendance/scan"
                className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200"
              >
                <QrCode className="size-3.5" />
                <span>Student Scan</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div className="px-4 sm:px-6 lg:px-8 pb-10">
          {/* Top Banner */}
          <div className="max-w-7xl mx-auto mb-6">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 backdrop-blur-sm">
                      <Activity className="size-3 text-indigo-300" />
                      Attendance Suite
                    </span>
                    <span className="text-xs text-indigo-300 font-mono">v1.1.0</span>
                    <span className="text-xs text-indigo-200/80 font-medium hidden md:inline">
                      &bull; Coimbatore Institute of Engineering and Technology
                    </span>
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                    Attendance Management
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-indigo-200 max-w-2xl">
                    Manage event attendance sessions, generate server-authoritative QR codes, and monitor realtime student and associate participation.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg transition-all flex items-center gap-2"
                >
                  <Plus className="size-4" />
                  Start New Session
                </Button>
              </div>
            </div>
          </div>

          {/* Modern Navigation Tabs */}
          <div className="max-w-7xl mx-auto mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab("sessions")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "sessions"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Calendar className="size-3.5" />
              <span>Sessions ({sessions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "analytics"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <BarChart3 className="size-3.5" />
              <span>Analytics & Department Insights</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("lookup")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "lookup"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <UserCheck className="size-3.5" />
              <span>Student Verification & OD</span>
            </button>
          </div>

          {/* Conditional Views */}
          {activeTab === "sessions" && (
            <>
              {/* Metrics Row */}
              <div className="max-w-7xl mx-auto mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Radio className="size-6 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Sessions
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{activeCount}</div>
            <div className="text-xs text-slate-400">Accepting verified scans</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Sun className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Morning Sessions
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{morningCount}</div>
            <div className="text-xs text-slate-400">Tracked morning period</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Moon className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Afternoon Sessions
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{afternoonCount}</div>
            <div className="text-xs text-slate-400">Tracked afternoon period</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="max-w-7xl mx-auto mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by session or event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterPeriod("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterPeriod === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center gap-3">
            <div className="size-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-500">Loading attendance sessions...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="p-3 rounded-full bg-slate-100 text-slate-400 w-fit mx-auto mb-3">
              <Calendar className="size-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Attendance Sessions Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Start an attendance session for an event or workshop to generate QR codes and accept attendee scans.
            </p>
            <Button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="mt-4 bg-indigo-600 text-white text-xs font-semibold"
            >
              Start First Session
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between"
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
                        <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        <CheckCircle className="size-3" />
                        Closed
                      </span>
                    )}
                  </div>

                  {/* Title & Event */}
                  <h3 className="text-base font-bold text-slate-900 line-clamp-1">{session.sessionName}</h3>
                  <p className="text-xs font-medium text-indigo-600 mt-0.5 line-clamp-1">{session.eventName}</p>
                  {session.subEventName && (
                    <p className="text-[11px] text-slate-500 line-clamp-1">Track: {session.subEventName}</p>
                  )}

                  {/* Metadata */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-500">
                    <div className="flex items-center justify-between">
                      <span>Started:</span>
                      <span className="font-mono text-slate-600">
                        {new Date(session.startsAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {session.endsAt && (
                      <div className="flex items-center justify-between">
                        <span>Ended:</span>
                        <span className="font-mono text-slate-600">
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
                <div className="mt-5 pt-3 border-t border-slate-100 space-y-2">
                  {/* Primary Row: QR & Live Feed */}
                  <div className={session.isActive ? "grid grid-cols-2 gap-2" : "flex"}>
                    {session.isActive && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setActiveQRModalSession(session)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5 w-full shadow-sm"
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
                      className={`text-xs font-medium text-slate-700 gap-1.5 hover:bg-slate-50 ${
                        session.isActive ? "w-full" : "w-full"
                      }`}
                    >
                      <Users className="size-3.5 text-indigo-600" />
                      Live Feed
                    </Button>
                  </div>

                  {/* Secondary Row: CSV, OD Report, End, Delete */}
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-50">
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadCSV(session.id)}
                        className="h-8 px-2 text-[11px] font-medium text-slate-700 gap-1 hover:bg-slate-50"
                        title="Download CSV attendance sheet for OD / college records"
                      >
                        <Download className="size-3 text-indigo-600" />
                        CSV
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveODSession(session)}
                        className="h-8 px-2 text-[11px] font-medium text-slate-700 gap-1 hover:bg-slate-50"
                        title="Generate Official On-Duty (OD) Sheet for HODs/Faculty"
                      >
                        <FileText className="size-3 text-indigo-600" />
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
                        className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
</div>
</div>

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

      {/* Official CIET Footer Box */}
      <footer className="max-w-7xl mx-auto mt-10 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-800 text-sm">Coimbatore Institute of Engineering and Technology</p>
        <p className="text-xs text-slate-600 mt-1">
          Narasipuram (P.O), Thondamuthur (Via), Vellimalaipattinam, Coimbatore - 641109, Tamil Nadu &bull; Ph: +91 422-2970703
        </p>
        <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
          Coders Club Platform &bull; Autonomous Institution Approved by AICTE, Affiliated to Anna University
        </p>
      </footer>
    </div>
  );
}
