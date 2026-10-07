"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  createAttendanceSession,
  refreshAttendanceChallenge,
  endAttendanceSession,
  getSessionRecords,
} from "@/lib/dynamic-qr/client";
import {
  type QRAttendanceSession,
  type QRChallenge,
  type QRAttendanceRecord,
  type AttendanceRole,
} from "@/lib/dynamic-qr/types";
import { PREDEFINED_EVENTS } from "@/lib/dynamic-qr/events";
import { useQRRealtime } from "@/lib/dynamic-qr/use-qr-realtime";
import { useAuth } from "@/lib/auth/use-auth";
import {
  QrCode,
  Users,
  Clock,
  ShieldCheck,
  Play,
  Square,
  RotateCw,
  Copy,
  ExternalLink,
  GraduationCap,
  Briefcase,
  CheckCircle,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

function generateRandomSuffix(): string {
  return Math.random().toString(36).substring(2, 9);
}

export default function DynamicQRPage() {
  const { user, role: userRole } = useAuth();

  // Mode Selection: "student" (Associate displays for students) or "associate" (Admin displays for associates)
  const [selectedRole, setSelectedRole] = useState<AttendanceRole>("student");

  // Event Selection Form State
  const [selectedEventId, setSelectedEventId] = useState<string>(PREDEFINED_EVENTS[0].id);
  const [customEventName, setCustomEventName] = useState<string>("");
  const [selectedSubEventId, setSelectedSubEventId] = useState<string>(
    PREDEFINED_EVENTS[0].sub_events[0]?.id || ""
  );
  const [selectedContext, setSelectedContext] = useState<string>(
    PREDEFINED_EVENTS[0].contexts[0]?.id || "session_1"
  );
  const [customContext, setCustomContext] = useState<string>("");
  const [refreshInterval, setRefreshInterval] = useState<number>(30);

  // Active Session State
  const [session, setSession] = useState<QRAttendanceSession | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<QRChallenge | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [sessionStatus, setSessionStatus] = useState<"idle" | "active" | "refreshing" | "ended">("idle");
  const [attendanceCount, setAttendanceCount] = useState<number>(0);
  const [records, setRecords] = useState<QRAttendanceRecord[]>([]);

  // UI feedback & error handling
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [originUrl] = useState<string>(() => (typeof window !== "undefined" ? window.location.origin : ""));

  const refreshLockRef = useRef<boolean>(false);

  // Event Selection Handler (directly updates sub-events and context on change without triggering synchronous setState in effect)
  function handleSelectEvent(eventId: string) {
    setSelectedEventId(eventId);
    const evt = PREDEFINED_EVENTS.find((e) => e.id === eventId);
    if (evt) {
      if (evt.sub_events.length > 0) {
        setSelectedSubEventId(evt.sub_events[0].id);
      } else {
        setSelectedSubEventId("");
      }
      if (evt.contexts.length > 0) {
        setSelectedContext(evt.contexts[0].id);
      }
    }
  }

  const activeEventData = PREDEFINED_EVENTS.find((e) => e.id === selectedEventId);

  // Server-authoritative Challenge Rotation
  const handleServerRotate = useCallback(async () => {
    if (!session || session.status === "ended" || refreshLockRef.current) return;
    refreshLockRef.current = true;
    setSessionStatus("refreshing");

    try {
      const result = await refreshAttendanceChallenge(session.id);
      setCurrentChallenge(result.challenge);
      setSecondsRemaining(result.remaining_seconds);
      setSessionStatus("active");
      setErrorBanner(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to refresh QR challenge";
      setErrorBanner(msg);
      setSessionStatus("active");
    } finally {
      refreshLockRef.current = false;
    }
  }, [session]);

  // Periodic Countdown Timer (Server authoritative countdown)
  useEffect(() => {
    if (sessionStatus !== "active" || !session) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          handleServerRotate();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionStatus, session, refreshInterval, handleServerRotate]);

  // Poll for attendance records and stats asynchronously
  useEffect(() => {
    if (sessionStatus !== "active" || !session?.id) return;
    const currentSessionId = session.id;
    let active = true;

    getSessionRecords(currentSessionId)
      .then((data) => {
        if (active) {
          setRecords(data);
          setAttendanceCount(data.length);
        }
      })
      .catch(() => {});

    const pollTimer = setInterval(() => {
      getSessionRecords(currentSessionId)
        .then((data) => {
          if (active) {
            setRecords(data);
            setAttendanceCount(data.length);
          }
        })
        .catch(() => {});
    }, 4000);

    return () => {
      active = false;
      clearInterval(pollTimer);
    };
  }, [sessionStatus, session?.id]);

  // Supabase Realtime Integration
  useQRRealtime({
    sessionId: session?.id,
    onChallengeRotated: (challenge, remaining) => {
      setCurrentChallenge(challenge);
      setSecondsRemaining(remaining);
    },
    onSessionEnded: () => {
      setSessionStatus("ended");
      setSuccessBanner("Attendance session was concluded by the coordinator.");
    },
    onAttendanceMarked: (payload) => {
      if (payload.count !== undefined) {
        setAttendanceCount(payload.count);
      } else {
        setAttendanceCount((c) => c + 1);
      }
      if (session?.id) {
        getSessionRecords(session.id).then(setRecords).catch(() => {});
      }
    },
  });

  // Start Session
  async function handleStartSession() {
    setErrorBanner(null);
    setSuccessBanner(null);

    const eventName = selectedEventId === "custom"
      ? customEventName.trim()
      : activeEventData?.name || "General Session";

    if (!eventName) {
      setErrorBanner("Please specify an event name.");
      return;
    }

    const subEvent = activeEventData?.sub_events.find((s) => s.id === selectedSubEventId);
    const subEventName = subEvent ? subEvent.name : undefined;

    const contextVal = selectedContext === "custom"
      ? customContext.trim()
      : selectedContext;

    if (!contextVal) {
      setErrorBanner("Please select or enter an attendance context.");
      return;
    }

    try {
      const response = await createAttendanceSession({
        event_id: selectedEventId === "custom" ? `custom-${generateRandomSuffix()}` : selectedEventId,
        event_name: eventName,
        sub_event_id: selectedSubEventId || undefined,
        sub_event_name: subEventName,
        attendance_context: contextVal,
        target_role: selectedRole,
        refresh_interval_seconds: refreshInterval,
      });

      setSession(response.session);
      setCurrentChallenge(response.challenge);
      setSecondsRemaining(refreshInterval);
      setAttendanceCount(0);
      setRecords([]);
      setSessionStatus("active");
      setSuccessBanner(`Attendance QR Session started for ${selectedRole === "student" ? "Students" : "Associates"}!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start attendance session";
      setErrorBanner(msg);
    }
  }

  // End Session
  async function handleEndSession() {
    if (!session) return;
    try {
      await endAttendanceSession(session.id);
      setSessionStatus("ended");
      setSession((prev) => (prev ? { ...prev, status: "ended" } : null));
      setSuccessBanner(`Session ended successfully. Final attendees: ${attendanceCount}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to end session";
      setErrorBanner(msg);
    }
  }

  // Generate complete scannable URL
  const qrScanUrl = session && currentChallenge
    ? `${originUrl}/dynamic-qr/scan?sid=${session.id}&token=${currentChallenge.challenge_token}`
    : "";

  const copyScanLink = () => {
    if (!qrScanUrl) return;
    navigator.clipboard.writeText(qrScanUrl);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / refreshInterval) * 100));

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Top Header & Role Badge */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                <QrCode className="h-5 w-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                Dynamic QR Attendance
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Server-controlled, anti-replay attendance system for Coders Club
            </p>
          </div>

          {/* Role & Operator Info */}
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 shadow-sm text-xs">
              <span className="text-gray-500">Logged in as: </span>
              <span className="font-semibold text-gray-800">{user?.email || "Associate"}</span>
              <span className="ml-1.5 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                {userRole || "Associate"}
              </span>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {errorBanner && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
            <p className="font-medium">{errorBanner}</p>
          </div>
        )}

        {successBanner && (
          <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
            <p className="font-medium">{successBanner}</p>
          </div>
        )}

        {/* Role Selector Tabs (Two Required Use Cases) */}
        {sessionStatus !== "active" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSelectedRole("student")}
              className={`flex items-start gap-4 rounded-2xl border p-5 text-left transition-all ${
                selectedRole === "student"
                  ? "border-indigo-600 bg-white ring-2 ring-indigo-600/20 shadow-md"
                  : "border-gray-200 bg-white/70 hover:bg-white"
              }`}
            >
              <div className={`rounded-xl p-3 ${selectedRole === "student" ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-600"}`}>
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">1. Student Attendance QR</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Operated by Associates. Students scan via phone camera or Google Lens to register attendance for assigned workshops or events.
                </p>
                <span className="mt-2.5 inline-block text-[11px] font-semibold text-indigo-600">
                  Target: Students (No login required)
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole("associate")}
              className={`flex items-start gap-4 rounded-2xl border p-5 text-left transition-all ${
                selectedRole === "associate"
                  ? "border-indigo-600 bg-white ring-2 ring-indigo-600/20 shadow-md"
                  : "border-gray-200 bg-white/70 hover:bg-white"
              }`}
            >
              <div className={`rounded-xl p-3 ${selectedRole === "associate" ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-600"}`}>
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">2. Associate Attendance QR</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Operated by Admins. Associates scan to verify coordination duties, mentor participation, or team debrief meetings.
                </p>
                <span className="mt-2.5 inline-block text-[11px] font-semibold text-indigo-600">
                  Target: Associates (Authenticated accounts)
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Main Dashboard Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

          {/* LEFT COLUMN: Controls & Event Details */}
          <div className="lg:col-span-5 space-y-6">

            {/* Session Configuration Card */}
            <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 flex items-center justify-between">
                <span>{sessionStatus === "active" ? "Active Session Details" : "Configure Attendance Session"}</span>
                {sessionStatus === "active" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                    Live
                  </span>
                )}
              </h2>

              {sessionStatus === "idle" || sessionStatus === "ended" ? (
                <div className="mt-5 space-y-4">
                  {/* Event Select */}
                  <div>
                    <label htmlFor="eventSelect" className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Event *
                    </label>
                    <select
                      id="eventSelect"
                      value={selectedEventId}
                      onChange={(e) => handleSelectEvent(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    >
                      {PREDEFINED_EVENTS.map((evt) => (
                        <option key={evt.id} value={evt.id}>
                          {evt.name} ({evt.category})
                        </option>
                      ))}
                      <option value="custom">+ Custom Event Name</option>
                    </select>
                  </div>

                  {selectedEventId === "custom" && (
                    <div>
                      <label htmlFor="customEvent" className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Custom Event Title
                      </label>
                      <input
                        id="customEvent"
                        type="text"
                        placeholder="Enter event name..."
                        value={customEventName}
                        onChange={(e) => setCustomEventName(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  )}

                  {/* Sub-event / Track */}
                  {activeEventData && activeEventData.sub_events.length > 0 && selectedEventId !== "custom" && (
                    <div>
                      <label htmlFor="subEventSelect" className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Sub-event / Track
                      </label>
                      <select
                        id="subEventSelect"
                        value={selectedSubEventId}
                        onChange={(e) => setSelectedSubEventId(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      >
                        {activeEventData.sub_events.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Attendance Context */}
                  <div>
                    <label htmlFor="contextSelect" className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Attendance Context / Period *
                    </label>
                    <select
                      id="contextSelect"
                      value={selectedContext}
                      onChange={(e) => setSelectedContext(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    >
                      {activeEventData?.contexts.map((ctx) => (
                        <option key={ctx.id} value={ctx.id}>
                          {ctx.label}
                        </option>
                      ))}
                      <option value="custom">+ Custom Context Label</option>
                    </select>
                  </div>

                  {selectedContext === "custom" && (
                    <div>
                      <label htmlFor="customContext" className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Custom Context Name
                      </label>
                      <input
                        id="customContext"
                        type="text"
                        placeholder="e.g. Workshop Session 3"
                        value={customContext}
                        onChange={(e) => setCustomContext(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  )}

                  {/* Refresh Interval (Server-Controlled Rotation Period) */}
                  <div>
                    <label htmlFor="intervalSelect" className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Server Challenge Validity Window
                    </label>
                    <select
                      id="intervalSelect"
                      value={refreshInterval}
                      onChange={(e) => setRefreshInterval(Number(e.target.value))}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value={15}>15 seconds (High Security / Fast Rotation)</option>
                      <option value={30}>30 seconds (Standard Authoritative Rotation)</option>
                      <option value={45}>45 seconds (Auditorium / Large Hall)</option>
                      <option value={60}>60 seconds (Extended Window)</option>
                    </select>
                    <p className="mt-1 text-[11px] text-gray-500">
                      Authoritative server rotation invalidates tokens after this window to prevent screenshot sharing.
                    </p>
                  </div>

                  {/* Start Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleStartSession}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 active:scale-[0.99] transition-all"
                    >
                      <Play className="h-4 w-4" /> Start Attendance QR Session
                    </button>
                  </div>
                </div>
              ) : (
                /* Active Session Information Display */
                <div className="mt-5 space-y-4 text-sm">
                  <div className="rounded-2xl bg-gray-50 p-4 space-y-3 border border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Event</p>
                      <p className="text-base font-bold text-gray-900">{session?.event_name}</p>
                    </div>

                    {session?.sub_event_name && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Sub-event</p>
                        <p className="font-medium text-gray-800">{session.sub_event_name}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200/60">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Context</p>
                        <p className="font-semibold text-indigo-700">{session?.attendance_context}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Audience</p>
                        <span className="capitalize font-semibold text-gray-800">
                          {session?.target_role}s
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-gray-200/60 flex items-center justify-between text-xs text-gray-500">
                      <span>Session Code: <strong className="font-mono text-gray-800">{session?.session_code}</strong></span>
                      <span>Started: {session ? new Date(session.started_at).toLocaleTimeString() : ""}</span>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex flex-col gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={handleServerRotate}
                      disabled={sessionStatus === "refreshing"}
                      className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      <RotateCw className={`h-3.5 w-3.5 ${sessionStatus === "refreshing" ? "animate-spin" : ""}`} />
                      Force Rotate Challenge Now
                    </button>

                    <button
                      type="button"
                      onClick={handleEndSession}
                      className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700"
                    >
                      <Square className="h-3.5 w-3.5" /> End Attendance Session
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Security Architecture Guarantees Badge */}
            <div className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-5 text-xs text-indigo-900 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-indigo-950">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                <span>Security & Anti-Replay Guarantees</span>
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-indigo-800/90 text-[11px]">
                <li><strong>Opaque Cryptographic Challenges:</strong> Zero student/associate personal data inside QR payload.</li>
                <li><strong>Single-Use Consumption:</strong> Challenges are atomically consumed upon successful scan.</li>
                <li><strong>Duplicate Prevention:</strong> Server rejects multiple scans for the same event & context.</li>
                <li><strong>Short Validity Window:</strong> Screenshots expire automatically after {refreshInterval} seconds.</li>
                <li><strong>Server Authoritative:</strong> Token validation and attendance creation executed server-side.</li>
              </ul>
            </div>

          </div>

          {/* RIGHT COLUMN: Scannable QR Code & Live Attendance Stats */}
          <div className="lg:col-span-7 space-y-6">

            {/* Scannable QR Display Card */}
            <div className="rounded-3xl border border-gray-200/80 bg-white p-6 sm:p-8 shadow-sm text-center">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="text-left">
                  <h2 className="text-lg font-bold text-gray-900">Attendance Display</h2>
                  <p className="text-xs text-gray-500">Scan with any smartphone camera or Google Lens</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    sessionStatus === "active"
                      ? "bg-green-100 text-green-700"
                      : sessionStatus === "ended"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {sessionStatus === "active" ? "Active QR" : sessionStatus === "ended" ? "Session Concluded" : "Ready to Start"}
                  </span>
                </div>
              </div>

              {/* QR Display Area */}
              <div className="mt-6 flex flex-col items-center justify-center">
                {sessionStatus === "active" && qrScanUrl ? (
                  <div className="flex flex-col items-center">
                    {/* QR Code Container with High Contrast and Scannable Padding */}
                    <div className="relative rounded-2xl border-4 border-indigo-600/30 p-5 bg-white shadow-xl">
                      <QRCodeCanvas
                        value={qrScanUrl}
                        size={280}
                        level="H"
                        marginSize={2}
                      />

                      {/* Small Overlay Badge when refreshing */}
                      {false && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-xs">
                          <div className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-md">
                            <RotateCw className="h-4 w-4 animate-spin" /> Rotating Challenge...
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Server Authoritative Expiration Progress */}
                    <div className="mt-5 w-full max-w-xs">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-indigo-600" /> Challenge Refreshes in
                        </span>
                        <span className="font-mono font-bold text-indigo-600">
                          00:{String(secondsRemaining).padStart(2, "0")}
                        </span>
                      </div>

                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full bg-indigo-600 transition-all duration-1000 ease-linear rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* QR Helpers: Copy Scan URL & Direct Test Link */}
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={copyScanLink}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copyFeedback ? "Copied Link!" : "Copy Scan URL"}
                      </button>

                      <a
                        href={qrScanUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open Scan Simulator
                      </a>
                    </div>
                  </div>
                ) : sessionStatus === "ended" ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                    <div className="rounded-full bg-red-100 p-4 text-red-600">
                      <Square className="h-8 w-8" />
                    </div>
                    <p className="mt-3 text-lg font-bold text-gray-900">Attendance Session Concluded</p>
                    <p className="mt-1 text-sm text-gray-500">All challenge tokens have been permanently expired.</p>
                    <button
                      type="button"
                      onClick={() => setSessionStatus("idle")}
                      className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                    >
                      Start New Attendance Session
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                    <div className="rounded-2xl border-2 border-dashed border-gray-300 p-8">
                      <QrCode className="h-16 w-16 text-gray-300 mx-auto" />
                    </div>
                    <p className="mt-4 text-base font-semibold text-gray-700">No Active Attendance QR</p>
                    <p className="mt-1 text-xs text-gray-500 max-w-sm">
                      Configure your event details on the left and click &quot;Start Attendance QR Session&quot; to begin.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Real-time Attendees Feed & Metrics */}
            <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Users className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-gray-900">Live Attendance Feed</h3>
                    <p className="text-[11px] text-gray-500">Real-time attendance recordings</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-black text-indigo-600">{attendanceCount}</span>
                  <span className="text-xs text-gray-500 ml-1">Present</span>
                </div>
              </div>

              {/* Records List */}
              <div className="mt-4">
                {records.length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-400">
                    {sessionStatus === "active"
                      ? "Waiting for attendees to scan the QR code..."
                      : "Start a session to record attendance."}
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 text-xs">
                    {records.map((rec) => (
                      <div key={rec.id} className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700 font-bold text-[10px]">
                            ✓
                          </span>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {rec.student_name || rec.associate_name || "Attendee"}
                            </p>
                            {rec.student_reg_number && (
                              <p className="font-mono text-gray-500 text-[10px]">{rec.student_reg_number}</p>
                            )}
                          </div>
                        </div>

                        <div className="text-right text-[11px] text-gray-400">
                          <p>{new Date(rec.marked_at).toLocaleTimeString()}</p>
                          <span className="inline-flex items-center gap-0.5 text-green-600 font-medium">
                            <Sparkles className="h-2.5 w-2.5" /> Verified
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </main>
  );
}