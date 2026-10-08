"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  createAttendanceSession,
  refreshAttendanceChallenge,
  endAttendanceSession,
  getSessionRecords,
  getAttendanceSession,
  getQREvents,
  listAttendanceSessions,
  QRApiError,
} from "@/lib/dynamic-qr/client";
import {
  type QRAttendanceSession,
  type QRChallenge,
  type QRAttendanceRecord,
  type AttendanceRole,
  type AttendanceContextType,
  type EventOption,
} from "@/lib/dynamic-qr/types";
import { useQRRealtime } from "@/lib/dynamic-qr/use-qr-realtime";
import { useAuth } from "@/lib/auth/use-auth";
import { canOperateQR } from "@/lib/auth/access";
import { ManagementGuard } from "@/components/auth/management-guard";
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
import { PageHeader, StatusIndicator } from "@/components/ui/cyberpunk";

export default function DynamicQRPage() {
  return <ManagementGuard><DynamicQRManagement /></ManagementGuard>;
}

function DynamicQRManagement() {
  const { user, role: userRole } = useAuth();

  // Associate consumption is deferred; both approved manager roles can operate student QR.
  const [selectedRole, setSelectedRole] = useState<AttendanceRole>("student");
  const [events, setEvents] = useState<EventOption[]>([]);
  const [recentSessions, setRecentSessions] = useState<QRAttendanceSession[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedContext, setSelectedContext] = useState<AttendanceContextType>("morning");
  const [eventsLoading, setEventsLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const mutationRef = useRef(false);
  const aliveRef = useRef(true);
  const generationRef = useRef(0);
  const reloadSequenceRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
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
  const [originUrl, setOriginUrl] = useState<string>(() => (typeof window !== "undefined" ? window.location.origin : ""));
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      setOriginUrl(window.location.origin);
    }
  }, []);

  const refreshLockRef = useRef<boolean>(false);
  const rotationRetryAtRef = useRef(0);

  function handleSelectEvent(id: string) { setSelectedEventId(id); }
  const activeEventData = events.find(event => event.id === selectedEventId);
  useEffect(() => {
    aliveRef.current = true;
    let active = true;
    Promise.all([getQREvents(), listAttendanceSessions()]).then(([available, recent]) => {
      if (!active) return;
      setEvents(available); setRecentSessions(recent);
      setSelectedEventId(available[0]?.id ?? ""); setEventsLoading(false);
    }).catch(error => { if (active) { setErrorBanner(error instanceof Error ? error.message : "Unable to load authorized events."); setEventsLoading(false); } });
    return () => { active = false; aliveRef.current = false; };
  }, []);

  const applySession = useCallback((next: QRAttendanceSession) => {
    setSession(next); setCurrentChallenge(next.current_challenge ?? null);
    setRefreshInterval(next.validity_seconds); setAttendanceCount(next.attendance_count);
    setSecondsRemaining(next.current_challenge ? Math.max(0, Math.ceil((Date.parse(next.current_challenge.expires_at) - Date.now()) / 1000)) : 0);
    setSessionStatus(next.status === "active" ? "active" : "ended");
  }, []);

  async function selectExisting(id: string) {
    if (!id || mutationRef.current || refreshLockRef.current) return;
    sessionIdRef.current = id; const generation = ++generationRef.current;
    try { const next = await getAttendanceSession(id); if (aliveRef.current && sessionIdRef.current === id && generation === generationRef.current) { applySession(next); setErrorBanner(null); } }
    catch (error) { if (aliveRef.current && sessionIdRef.current === id && generation === generationRef.current) setErrorBanner(error instanceof Error ? error.message : "Unable to load session."); }
  }

  const canMutate = !!session && (userRole === "admin" || (session.created_by === user?.id && session.creator_role === "associate" && session.target_role === "student"));
  const handleServerRotate = useCallback(async () => {
    if (!session || session.status !== "active" || !session.latest_challenge_id || !canMutate || refreshLockRef.current || mutationRef.current) return;
    const id = session.id; generationRef.current++; refreshLockRef.current = true;
    setSessionStatus("refreshing");
    try {
      await refreshAttendanceChallenge(id, session.latest_challenge_id, refreshInterval);
      const next = await getAttendanceSession(id);
      if (aliveRef.current && sessionIdRef.current === id) { applySession(next); setErrorBanner(null); }
    } catch (error) {
      rotationRetryAtRef.current = Date.now() + 10000;
      if (!aliveRef.current || sessionIdRef.current !== id) return;
      if (error instanceof QRApiError && error.status === 409) {
        try { const next = await getAttendanceSession(id); if (aliveRef.current && sessionIdRef.current === id) applySession(next); }
        catch { setErrorBanner("Session state changed. Reload the session."); setSessionStatus("active"); }
      } else { setErrorBanner(error instanceof Error ? error.message : "Unable to rotate QR."); setSessionStatus("active"); }
    } finally { refreshLockRef.current = false; }
  }, [session, canMutate, refreshInterval, applySession]);

  // Read durable state on signals and a bounded fallback interval. No optimistic counts.
  const activeSessionId = session?.id;
  const reload = useCallback(async () => {
    if (!activeSessionId || refreshLockRef.current || mutationRef.current) return;
    const id = activeSessionId; const generation = generationRef.current; const sequence = ++reloadSequenceRef.current;
    try {
      const [next, data] = await Promise.all([getAttendanceSession(id), getSessionRecords(id)]);
      if (aliveRef.current && sessionIdRef.current === id && generation === generationRef.current && sequence === reloadSequenceRef.current) { applySession(next); setRecords(data); setErrorBanner(null); }
    } catch (error) { if (aliveRef.current && sessionIdRef.current === id && generation === generationRef.current && sequence === reloadSequenceRef.current) setErrorBanner(error instanceof Error ? error.message : "Unable to refresh attendance."); }
  }, [activeSessionId, applySession]);
  useEffect(() => {
    if (!session?.id) return;
    let active = true;
    const run = () => { if (active) void reload(); };
    const immediate = setTimeout(run, 0); const poll = setInterval(run, 4000);
    return () => { active = false; clearTimeout(immediate); clearInterval(poll); };
  }, [session?.id, reload]);
  useQRRealtime({sessionId:session?.id, onChange:() => { void reload(); }});
  useEffect(() => {
    if (sessionStatus !== "active" || !session) return;
    const timer = setInterval(() => {
      const remaining = currentChallenge ? Math.max(0, Math.ceil((Date.parse(currentChallenge.expires_at) - Date.now()) / 1000)) : 0;
      setSecondsRemaining(remaining);
      if (remaining === 0 && canMutate && Date.now() >= rotationRetryAtRef.current) void handleServerRotate();
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStatus, session, currentChallenge, canMutate, handleServerRotate]);

  // Start Session
  async function handleStartSession() {
    if (mutationRef.current || refreshLockRef.current) return;
    if ((!canOperateQR(userRole, "student") && userRole !== "admin") || selectedRole !== "student") {
      setErrorBanner("Associate consumption is deferred. Choose student attendance."); return;
    }
    if (!activeEventData) { setErrorBanner("Choose an authorized existing event."); return; }
    generationRef.current++; mutationRef.current = true; setStarting(true); setErrorBanner(null); setSuccessBanner(null);
    try {
      const response = await createAttendanceSession({event_node_id:selectedEventId, attendance_context:selectedContext, target_role:"student", validity_seconds:refreshInterval});
      if (!aliveRef.current) return;
      sessionIdRef.current = response.session.id; applySession(response.session); setRecords([]);
      setRecentSessions(previous => [response.session, ...previous]); setSuccessBanner("Student attendance session started.");
    } catch (error) { if (aliveRef.current) setErrorBanner(error instanceof Error ? error.message : "Unable to start session."); }
    finally { mutationRef.current = false; if (aliveRef.current) setStarting(false); }
  }
  async function handleEndSession() {
    if (!session || mutationRef.current || refreshLockRef.current) return;
    const id = session.id; generationRef.current++; mutationRef.current = true; setEnding(true);
    try {
      await endAttendanceSession(id); const next = await getAttendanceSession(id);
      if (aliveRef.current && sessionIdRef.current === id) { applySession(next); setSuccessBanner("Session ended."); setErrorBanner(null); }
    } catch (error) {
      if (aliveRef.current && sessionIdRef.current === id) setErrorBanner(error instanceof Error ? error.message : "Unable to end session.");
    } finally { mutationRef.current = false; if (aliveRef.current) setEnding(false); }
  }

  // Generate complete scannable URL
  const activeOrigin = originUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const qrScanUrl = session && currentChallenge && activeOrigin
    ? `${activeOrigin}/dynamic-qr/scan?sid=${session.id}&token=${currentChallenge.challenge_token}`
    : "";

  const copyScanLink = () => {
    if (!qrScanUrl) return;
    void navigator.clipboard.writeText(qrScanUrl).then(() => {
      if (!aliveRef.current) return; setCopyFeedback(true);
      setTimeout(() => { if (aliveRef.current) setCopyFeedback(false); }, 2000);
    }).catch(() => { if (aliveRef.current) setErrorBanner("Unable to copy the scan link."); });
  };

  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / refreshInterval) * 100));

  return (
    <div className="space-y-6">
      {/* Top Header & Role Badge */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader 
          moduleCode="SEC // 03" 
          category="SECURITY" 
          title="Dynamic QR System" 
          description="Server-controlled, anti-replay attendance system with cryptographic challenge rotation and short-validity tokens."
          icon={QrCode} 
        />

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-[#292D33] bg-[#0D0F12] px-3.5 py-1.5 shadow-sm text-xs">
            <span className="text-[#686C74]">Operator: </span>
            <span className="font-mono text-[#F3F1EC]">{user?.email || "Signed-in user"}</span>
            <span className="ml-1.5 rounded bg-[#FF2A1A]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#FF2A1A] border border-[#FF2A1A]/20">
              {userRole || "No role"}
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
        {(sessionStatus === "idle" || sessionStatus === "ended") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              disabled={userRole !== "admin" && !canOperateQR(userRole, "student")}
              onClick={() => setSelectedRole("student")}
              className={`flex items-start gap-4 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                selectedRole === "student"
                  ? "border-[#FF2A1A] bg-[#FF2A1A]/5 shadow-md"
                  : "border-[#292D33] bg-[#111318] hover:border-[#3A3E45]"
              }`}
            >
              <div className={`rounded-xl p-3 ${selectedRole === "student" ? "bg-[#FF2A1A]/10 text-[#FF2A1A]" : "bg-[#171A20] text-[#9B9EA6]"}`}>
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-[#F3F1EC]">1. Student Attendance QR</h3>
                <p className="mt-1 text-xs text-[#686C74]">
                  Operated by Associates. Students scan via phone camera or Google Lens to register attendance for assigned workshops or events.
                </p>
                <span className="mt-2.5 inline-block text-[11px] font-semibold text-[#FF2A1A]">
                  Target: Students (No login required)
                </span>
              </div>
            </button>

            <button
              type="button"
              disabled={true}
              onClick={() => setSelectedRole("associate")}
              className={`flex items-start gap-4 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                selectedRole === "associate"
                  ? "border-[#FF2A1A] bg-[#FF2A1A]/5 shadow-md"
                  : "border-[#292D33] bg-[#111318] hover:border-[#3A3E45]"
              }`}
            >
              <div className={`rounded-xl p-3 ${selectedRole === "associate" ? "bg-[#FF2A1A]/10 text-[#FF2A1A]" : "bg-[#171A20] text-[#9B9EA6]"}`}>
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-[#F3F1EC]">2. Associate Attendance QR</h3>
                <p className="mt-1 text-xs text-[#686C74]">
                  Operated by Admins. Associates scan to verify coordination duties, mentor participation, or team debrief meetings.
                </p>
                <span className="mt-2.5 inline-block text-[11px] font-semibold text-[#FF2A1A]">
                  Associate scanning deferred — Proposal 002 is not deployed
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
            <div className="rounded-xl border border-[#292D33] bg-[#111318] p-6">
              <h2 className="text-lg font-bold text-[#F3F1EC] flex items-center justify-between">
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
                  <div>
                    <label htmlFor="existingSession" className="block text-xs font-semibold uppercase tracking-wider text-[#9B9EA6]">Open existing session</label>
                    <select id="existingSession" defaultValue="" onChange={e => { void selectExisting(e.target.value); }} className="mt-1.5 w-full rounded-xl border border-[#292D33] px-3.5 py-2.5 text-sm">
                      <option value="">Choose a saved session</option>
                      {recentSessions.map(item => <option key={item.id} value={item.id}>{item.event_name} — {item.attendance_context} — {item.status}</option>)}
                    </select>
                  </div>
                  {!eventsLoading && events.length === 0 && <p className="text-sm text-[#9B9EA6]">No authorized active events are available.</p>}
                  {/* Event Select */}
                  <div>
                    <label htmlFor="eventSelect" className="block text-xs font-semibold uppercase tracking-wider text-[#9B9EA6]">
                      Event *
                    </label>
                    <select
                      id="eventSelect"
                      value={selectedEventId}
                      onChange={(e) => handleSelectEvent(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-[#292D33] px-3.5 py-2.5 text-sm font-medium text-[#F3F1EC] focus:border-[#FF2A1A]/50 focus:outline-none bg-[#0D0F12]"
                    >
                      {events.map((evt) => (
                        <option key={evt.id} value={evt.id}>
                          {evt.name}
                        </option>
                      ))}
                      <option value="" disabled>{eventsLoading ? "Loading authorized events…" : "Choose an event"}</option>
                    </select>
                  </div>

                  {/* Attendance Context */}
                  <div>
                    <label htmlFor="contextSelect" className="block text-xs font-semibold uppercase tracking-wider text-[#9B9EA6]">
                      Attendance Context / Period *
                    </label>
                    <select
                      id="contextSelect"
                      value={selectedContext}
                      onChange={(e) => setSelectedContext(e.target.value === "afternoon" ? "afternoon" : "morning")}
                      className="mt-1.5 w-full rounded-xl border border-[#292D33] px-3.5 py-2.5 text-sm font-medium text-[#F3F1EC] focus:border-[#FF2A1A]/50 focus:outline-none bg-[#0D0F12]"
                    >
                      <option value="morning">Morning</option>
                      <option value="afternoon">Afternoon</option>
                    </select>
                  </div>

                  {/* Refresh Interval (Server-Controlled Rotation Period) */}
                  <div>
                    <label htmlFor="intervalSelect" className="block text-xs font-semibold uppercase tracking-wider text-[#9B9EA6]">
                      Server Challenge Validity Window
                    </label>
                    <select
                      id="intervalSelect"
                      value={refreshInterval}
                      onChange={(e) => setRefreshInterval(Number(e.target.value))}
                      className="mt-1.5 w-full rounded-xl border border-[#292D33] px-3.5 py-2.5 text-sm font-medium text-[#F3F1EC] focus:border-[#FF2A1A]/50 focus:outline-none bg-[#0D0F12]"
                    >
                      <option value={15}>15 seconds (High Security / Fast Rotation)</option>
                      <option value={30}>30 seconds (Standard Authoritative Rotation)</option>
                      <option value={45}>45 seconds (Auditorium / Large Hall)</option>
                      <option value={60}>60 seconds (Extended Window)</option>
                    </select>
                    <p className="mt-1 text-[11px] text-[#686C74]">
                      Authoritative server rotation invalidates tokens after this window to prevent screenshot sharing.
                    </p>
                  </div>

                  {/* Start Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleStartSession}
                      disabled={starting || eventsLoading || !selectedEventId}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF2A1A] px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#C51D16] active:scale-[0.99] transition-all"
                    >
                      <Play className="h-4 w-4" /> Start Attendance QR Session
                    </button>
                  </div>
                </div>
              ) : (
                /* Active Session Information Display */
                <div className="mt-5 space-y-4 text-sm">
                  <div className="rounded-xl bg-[#0D0F12] p-4 space-y-3 border border-[#292D33]">
                    <div>
                      <p className="text-xs text-[#686C74] uppercase font-semibold">Event</p>
                      <p className="text-base font-bold text-[#F3F1EC]">{session?.event_name}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#292D33]/60">
                      <div>
                        <p className="text-xs text-[#686C74] uppercase font-semibold">Context</p>
                        <p className="font-semibold text-[#7FA7FF]">{session?.attendance_context}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#686C74] uppercase font-semibold">Audience</p>
                        <span className="capitalize font-semibold text-[#F3F1EC]">
                          {session?.target_role}s
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-[#292D33]/60 flex items-center justify-between text-xs text-[#686C74]">
                      <span>Session ID: <strong className="font-mono text-[#F3F1EC]">{session?.id}</strong></span>
                      <span>Started: {session ? new Date(session.started_at).toLocaleTimeString() : ""}</span>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex flex-col gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={handleServerRotate}
                      disabled={!canMutate || !session?.latest_challenge_id || sessionStatus === "refreshing" || ending}
                      className="flex items-center justify-center gap-2 rounded-xl border border-[#292D33] bg-[#0D0F12] px-4 py-2.5 text-xs font-semibold text-[#9B9EA6] hover:border-[#3A3E45] disabled:opacity-50"
                    >
                      <RotateCw className={`h-3.5 w-3.5 ${sessionStatus === "refreshing" ? "animate-spin" : ""}`} />
                      Force Rotate Challenge Now
                    </button>

                    <button
                      type="button"
                      onClick={handleEndSession}
                      disabled={ending || !canMutate || sessionStatus === "refreshing"}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#FF2A1A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#C51D16]"
                    >
                      <Square className="h-3.5 w-3.5" /> End Attendance Session
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Security Architecture Guarantees Badge */}
            <div className="rounded-xl border border-[#FF2A1A]/20 bg-[#FF2A1A]/5 p-5 text-xs space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-[#F3F1EC]">
                <ShieldCheck className="h-4 w-4 text-[#FF2A1A]" />
                <span>Security & Anti-Replay Guarantees</span>
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-[#9B9EA6] text-[11px]">
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
            <div className="rounded-3xl border border-[#292D33]/80 bg-[#111318] p-6 sm:p-8 shadow-sm text-center">
              <div className="flex items-center justify-between border-b border-[#292D33] pb-4">
                <div className="text-left">
                  <h2 className="text-lg font-bold text-[#F3F1EC]">Attendance Display</h2>
                  <p className="text-xs text-[#686C74]">Scan with any smartphone camera or Google Lens</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    sessionStatus === "active"
                      ? "bg-[#32C979]/10 text-[#32C979] font-mono text-[10px] uppercase tracking-wider"
                      : sessionStatus === "ended"
                      ? "bg-[#FF2A1A]/10 text-[#FF2A1A] font-mono text-[10px] uppercase tracking-wider"
                      : "bg-[#171A20] text-[#9B9EA6]"
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
                    <div className="relative rounded-xl border-2 border-[#292D33] p-5 bg-white shadow-xl">
                      <QRCodeCanvas
                        value={qrScanUrl}
                        size={280}
                        level="H"
                        marginSize={2}
                      />

                      {/* Small Overlay Badge when refreshing */}
                      {false && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-[#111318]/80 backdrop-blur-xs">
                          <div className="flex items-center gap-2 rounded-xl bg-[#FF2A1A] px-3 py-1.5 text-xs font-bold text-white shadow-md">
                            <RotateCw className="h-4 w-4 animate-spin" /> Rotating Challenge...
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Server Authoritative Expiration Progress */}
                    <div className="mt-6 w-full max-w-sm space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#9B9EA6]">
                          TOKEN VALIDITY WINDOW
                        </span>
                        <span className="font-numeric-stat text-[#FF2A1A]">
                          00:{String(secondsRemaining).padStart(2, "0")}
                        </span>
                      </div>

                      <div className="h-1.5 w-full overflow-hidden bg-[#292D33]">
                        <div
                          className="h-full bg-[#FF2A1A] transition-all duration-1000 ease-linear"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* QR Helpers: Copy Scan URL & Direct Test Link */}
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={copyScanLink}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#292D33] bg-[#08090B] px-3 py-1.5 text-xs font-medium text-[#9B9EA6] hover:border-[#3A3E45] hover:bg-[#171A20]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copyFeedback ? "Copied Link!" : "Copy Scan URL"}
                      </button>

                      <a
                        href={qrScanUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#7FA7FF]/30 bg-[#7FA7FF]/10 px-3 py-1.5 text-xs font-medium text-[#7FA7FF] hover:bg-[#7FA7FF]/20"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open Scan Simulator
                      </a>
                    </div>
                  </div>
                ) : sessionStatus === "ended" ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-[#686C74]">
                    <div className="rounded-full bg-red-100 p-4 text-red-600">
                      <Square className="h-8 w-8" />
                    </div>
                    <p className="mt-3 text-lg font-bold text-[#F3F1EC]">Attendance Session Concluded</p>
                    <p className="mt-1 text-sm text-[#686C74]">All challenge tokens have been permanently expired.</p>
                    <button
                      type="button"
                      onClick={() => setSessionStatus("idle")}
                      className="mt-4 rounded-xl bg-[#FF2A1A] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#C51D16]"
                    >
                      Start New Attendance Session
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-[#686C74] 00">
                    <div className="rounded-2xl border-2 border-dashed border-[#292D33] p-8">
                      <QrCode className="h-16 w-16 text-[#3A3E45] mx-auto" />
                    </div>
                    <p className="mt-4 text-base font-semibold text-[#9B9EA6]">No Active Attendance QR</p>
                    <p className="mt-1 text-xs text-[#686C74] max-w-sm">
                      Configure your event details on the left and click &quot;Start Attendance QR Session&quot; to begin.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Real-time Attendees Feed & Metrics */}
            <div className="rounded-3xl border border-[#292D33]/80 bg-[#111318] p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#292D33] pb-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF2A1A]/10 text-[#FF2A1A]">
                    <Users className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-[#F3F1EC]">Live Attendance Feed</h3>
                    <p className="text-[11px] text-[#686C74]">Real-time attendance recordings</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-black text-[#FF2A1A]">{attendanceCount}</span>
                  <span className="text-xs text-[#686C74] ml-1">Present</span>
                </div>
              </div>

              {/* Records List */}
              <div className="mt-4">
                {records.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#686C74] font-mono">
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
                            <p className="font-semibold text-[#F3F1EC]">
                              {rec.student_name || rec.associate_name || `${rec.attendance_type}: ${rec.student_id || rec.associate_id}`}
                            </p>
                            {rec.student_reg_number && (
                              <p className="font-mono text-[#686C74] text-[10px]">{rec.student_reg_number}</p>
                            )}
                          </div>
                        </div>

                        <div className="text-right text-[11px] text-[#686C74] font-mono">
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
  );
}