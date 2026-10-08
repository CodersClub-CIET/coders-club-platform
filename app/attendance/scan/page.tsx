"use client";

export const dynamic = "force-dynamic";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  HandshakeChallenge,
  StudentAttendanceSubmission,
  AttendanceSession,
  DEPARTMENTS,
} from "@/lib/attendance/types";
import { attendanceService } from "@/lib/attendance/attendance-service";
import { validateStudentSubmission } from "@/lib/attendance/validation";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  GraduationCap,
  Layers,
  Lock,
  QrCode,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";

interface DeviceAttendanceRecord {
  sessionId: string;
  studentRegNo: string;
  studentName: string;
  department: string;
  year: number;
  section: string;
  markedAt: string;
}

function ScanContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [handshake, setHandshake] = useState<HandshakeChallenge | null>(null);
  const [activeSessions, setActiveSessions] = useState<AttendanceSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes
  const [error, setError] = useState<string | null>(null);
  const [noActiveSessions, setNoActiveSessions] = useState(false);

  // Device-level restriction: Only once per phone per session
  const [deviceSubmission, setDeviceSubmission] = useState<DeviceAttendanceRecord | null>(null);

  const [successRecord, setSuccessRecord] = useState<{
    name: string;
    identifier: string;
    roleOrClass: string;
    department: string;
    markedAt: string;
  } | null>(null);

  // Student Form State
  const [studentForm, setStudentForm] = useState<{
    studentRegNo: string;
    studentName: string;
    department: string;
    year: number;
    section: string;
  }>({
    studentRegNo: "",
    studentName: "",
    department: "CSE",
    year: 3,
    section: "A",
  });

  // Check if this device has already submitted attendance for the session
  const checkDeviceLock = (sessionId: string): DeviceAttendanceRecord | null => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(`coders_club_device_attendance_${sessionId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return null;
  };

  // 1. Initialize Verification / Handshake
  const initVerification = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoActiveSessions(false);
      setSuccessRecord(null);
      setDeviceSubmission(null);

      let targetSessionId = "";

      // If a QR token is present in the URL query string:
      if (token) {
        try {
          const challenge = await attendanceService.performHandshake(token);
          setHandshake(challenge);
          setTimeLeft(challenge.expiresInSeconds);
          setSelectedSessionId(challenge.sessionId);
          targetSessionId = challenge.sessionId;

          // Check if this device already submitted for THIS session
          const existingLock = checkDeviceLock(challenge.sessionId);
          if (existingLock) {
            setDeviceSubmission(existingLock);
          } else {
            setDeviceSubmission(null);
            // Pre-fill profile from previous submission on this device if available
            try {
              const saved = localStorage.getItem("coders_club_last_student_profile");
              if (saved) {
                const parsed = JSON.parse(saved);
                setStudentForm((prev) => ({
                  ...prev,
                  studentRegNo: parsed.studentRegNo || prev.studentRegNo,
                  studentName: parsed.studentName || prev.studentName,
                  department: parsed.department || prev.department,
                  year: parsed.year || prev.year,
                  section: parsed.section || prev.section,
                }));
              }
            } catch {
              // ignore
            }
          }

          setLoading(false);
          return;
        } catch (err: unknown) {
          console.error("QR Token verification error:", err);
          setError(err instanceof Error ? err.message : "QR token expired or invalid.");
          setLoading(false);
          return;
        }
      }

      // If no token or token handshake failed: Auto-bind to available active sessions
      const allSessions = await attendanceService.getSessions();
      const active = allSessions.filter((s) => s.isActive);
      setActiveSessions(active);

      if (active.length === 0) {
        setNoActiveSessions(true);
        if (!token) {
          setError(null);
        }
        setLoading(false);
        return;
      }

      // Automatically bind to the first active session
      const targetSession = active[0];
      targetSessionId = targetSession.id;
      setSelectedSessionId(targetSession.id);

      // Check device lock
      const existingLock = checkDeviceLock(targetSession.id);
      if (existingLock) {
        setDeviceSubmission(existingLock);
      } else {
        setDeviceSubmission(null);
      }

      const challenge = await attendanceService.createDirectChallenge(targetSession.id, "student");
      setHandshake(challenge);
      setTimeLeft(challenge.expiresInSeconds);
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to initialize attendance verification.");
      setLoading(false);
    }
  };

  useEffect(() => {
    initVerification();
  }, [token]);

  // Handle manual session switch when multiple active sessions exist
  const handleSessionChange = async (sessionId: string) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedSessionId(sessionId);

      // Check device lock for this switched session
      const existingLock = checkDeviceLock(sessionId);
      if (existingLock) {
        setDeviceSubmission(existingLock);
      } else {
        setDeviceSubmission(null);
      }

      const newChallenge = await attendanceService.createDirectChallenge(sessionId, "student");
      setHandshake(newChallenge);
      setTimeLeft(newChallenge.expiresInSeconds);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to switch active session.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Countdown timer for anti-replay challenge window (5 minutes)
  useEffect(() => {
    if (!handshake || successRecord || deviceSubmission || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError("Attendance submission window expired. Please refresh to renew.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [handshake, successRecord, deviceSubmission, timeLeft]);

  // Handle Refresh Security Window
  const handleRenewChallenge = async () => {
    if (!selectedSessionId && !handshake?.sessionId) return;
    const targetSessionId = selectedSessionId || handshake?.sessionId;
    if (!targetSessionId) return;

    try {
      setLoading(true);
      setError(null);
      const renewed = await attendanceService.createDirectChallenge(targetSessionId, "student");
      setHandshake(renewed);
      setTimeLeft(renewed.expiresInSeconds);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to renew challenge.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Student Submission
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handshake) return;

    // 1. Device Lock Check: Block multiple submissions from the same phone
    const existingLock = checkDeviceLock(handshake.sessionId);
    if (existingLock) {
      setDeviceSubmission(existingLock);
      setError("This phone has already submitted attendance for this session. Only one submission is allowed per device.");
      return;
    }

    const payload: StudentAttendanceSubmission = {
      challengeToken: handshake.challengeToken,
      studentRegNo: studentForm.studentRegNo.trim(),
      studentName: studentForm.studentName.trim(),
      department: studentForm.department,
      year: Number(studentForm.year),
      section: studentForm.section.toUpperCase(),
      clientTimestamp: new Date().toISOString(),
    };

    const validation = validateStudentSubmission(payload);
    if (!validation.isValid) {
      setError(validation.errors[0]);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const record = await attendanceService.submitStudentAttendance(payload);

      // Lock this device permanently for this session so another response cannot be uploaded
      const deviceRecord: DeviceAttendanceRecord = {
        sessionId: handshake.sessionId,
        studentRegNo: record.studentRegNo || studentForm.studentRegNo.trim().toUpperCase(),
        studentName: record.studentName || studentForm.studentName.trim(),
        department: studentForm.department,
        year: Number(studentForm.year),
        section: studentForm.section.toUpperCase(),
        markedAt: record.markedAt,
      };

      try {
        localStorage.setItem(
          `coders_club_device_attendance_${handshake.sessionId}`,
          JSON.stringify(deviceRecord)
        );
        localStorage.setItem(
          "coders_club_last_student_profile",
          JSON.stringify({
            studentRegNo: deviceRecord.studentRegNo,
            studentName: deviceRecord.studentName,
            department: deviceRecord.department,
            year: deviceRecord.year,
            section: deviceRecord.section,
          })
        );
      } catch {
        // ignore storage errors
      }

      setSuccessRecord({
        name: deviceRecord.studentName,
        identifier: deviceRecord.studentRegNo,
        roleOrClass: `${studentForm.year} (${studentForm.section.toUpperCase()})`,
        department: studentForm.department,
        markedAt: record.markedAt,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record attendance.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
      {/* Container Box */}
      <div className="w-full max-w-md bg-[#08090B]/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Brand Banner */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FF2A1A]/20 text-indigo-400 border border-indigo-500/30">
              <QrCode className="size-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">CIET Coders Club</h1>
              <p className="text-[11px] text-[#686C74]">Attendance Verification Portal</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="size-3" />
            Verified
          </span>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="size-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-xs text-[#686C74] font-medium">Connecting to attendance session...</p>
          </div>
        ) : noActiveSessions ? (
          /* No Active Sessions State */
          <div className="py-8 text-center flex flex-col items-center">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
              <Clock className="size-8" />
            </div>
            <h2 className="text-base font-bold text-white mb-1.5">No Active Attendance Session</h2>
            <p className="text-xs text-[#686C74] max-w-xs mb-6 leading-relaxed">
              There are currently no attendance sessions open for check-in. Please wait for an event coordinator or club lead to launch a session.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-xs">
              <Button
                type="button"
                onClick={initVerification}
                className="w-full bg-[#FF2A1A] hover:bg-[#FF2A1A] text-white text-xs font-semibold py-2 px-4 rounded-xl gap-2 shadow-md transition-all"
              >
                <RefreshCw className="size-3.5" />
                Check Again
              </Button>
              <Link
                href="/attendance"
                className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#686C74] hover:text-white bg-[#1D2026] hover:bg-slate-700/80 px-4 py-2 rounded-xl border border-slate-700 transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                Attendance Suite
              </Link>
            </div>
          </div>
        ) : deviceSubmission ? (
          /* DEVICE LOCKED STATE: Already filled once from this phone */
          <div className="py-6 text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-3">
              <Lock className="size-9" />
            </div>
            <h2 className="text-lg font-extrabold text-white mb-1">
              Attendance Already Recorded
            </h2>
            <p className="text-xs text-emerald-300 font-medium mb-5 max-w-xs leading-relaxed">
              This phone has already submitted attendance for this session. Only one response per device is permitted.
            </p>

            <div className="w-full bg-slate-950/70 rounded-2xl p-4 border border-slate-800 text-left space-y-2 mb-5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#686C74]">Student:</span>
                <span className="font-semibold text-white">{deviceSubmission.studentName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#686C74]">Reg Number:</span>
                <span className="font-mono font-semibold text-indigo-300">
                  {deviceSubmission.studentRegNo}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#686C74]">Department:</span>
                <span className="font-medium text-slate-200">{deviceSubmission.department}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#686C74]">Class & Sec:</span>
                <span className="font-medium text-slate-200">
                  {deviceSubmission.year} ({deviceSubmission.section})
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#686C74]">Event:</span>
                <span className="font-medium text-slate-200">{handshake?.eventName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#686C74]">Period:</span>
                <span className="capitalize font-medium text-amber-400">{handshake?.period}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#686C74]">Submitted At:</span>
                <span className="font-mono text-[#686C74]">
                  {new Date(deviceSubmission.markedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-[#686C74]">
              <Sparkles className="size-3.5 text-indigo-400 shrink-0" />
              <span>Response locked to this device. You may close this tab.</span>
            </div>
          </div>
        ) : error && !handshake ? (
          /* Error State with fallback options */
          <div className="py-8 text-center flex flex-col items-center">
            <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-3">
              <ShieldAlert className="size-8" />
            </div>
            <h2 className="text-base font-bold text-white mb-1">Scan Verification Notice</h2>
            <p className="text-xs text-rose-300 max-w-xs mb-5 leading-relaxed">{error}</p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <Button
                type="button"
                onClick={initVerification}
                className="w-full bg-[#FF2A1A] hover:bg-[#FF2A1A] text-white text-xs font-semibold py-2 rounded-xl gap-2"
              >
                <RefreshCw className="size-3.5" />
                Retry Connection
              </Button>
              <Link
                href="/attendance"
                className="inline-flex items-center justify-center gap-1 text-xs text-[#686C74] hover:text-white py-2"
              >
                <ArrowLeft className="size-3.5" />
                Back to Attendance Dashboard
              </Link>
            </div>
          </div>
        ) : successRecord ? (
          /* Success Screen (Immediately locks device - no re-submission) */
          <div className="py-6 text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
            <div className="p-3.5 rounded-2xl mb-3 border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <CheckCircle2 className="size-10" />
            </div>
            <h2 className="text-xl font-extrabold text-white mb-1">
              Attendance Confirmed!
            </h2>
            <p className="text-xs font-medium text-emerald-300 mb-5">
              Presence successfully verified and recorded in CIET database.
            </p>

            <div className="w-full bg-slate-950/70 rounded-2xl p-4 border border-slate-800 text-left space-y-2 mb-5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#686C74]">Student:</span>
                <span className="font-semibold text-white">{successRecord.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#686C74]">Reg Number:</span>
                <span className="font-mono font-semibold text-indigo-300">
                  {successRecord.identifier}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#686C74]">Class & Sec:</span>
                <span className="font-medium text-slate-200">{successRecord.roleOrClass}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#686C74]">Department:</span>
                <span className="font-medium text-slate-200">{successRecord.department}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#686C74]">Event:</span>
                <span className="font-medium text-slate-200">{handshake?.eventName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#686C74]">Period:</span>
                <span className="capitalize font-medium text-amber-400">{handshake?.period}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#686C74]">Time Marked:</span>
                <span className="font-mono text-[#686C74]">
                  {new Date(successRecord.markedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className="p-3 bg-[#FF2A1A]/10 border border-indigo-500/20 rounded-xl text-left w-full mb-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 mb-1">
                <Lock className="size-3.5" />
                <span>Single-Device Restriction</span>
              </div>
              <p className="text-[11px] text-[#686C74] leading-relaxed">
                Attendance has been locked to this device for this session. Multiple responses from the same phone are prohibited.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-[#686C74]">
              <Sparkles className="size-3.5 text-indigo-400" />
              <span>You may now close this browser tab.</span>
            </div>
          </div>
        ) : (
          /* Submission Form */
          <div>
            {/* Event Summary Card */}
            <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-indigo-300">{handshake?.eventName}</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                    handshake?.period === "morning"
                      ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                      : "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                  }`}
                >
                  {handshake?.period === "morning" ? <Sun className="size-3" /> : <Moon className="size-3" />}
                  {handshake?.period} Period
                </span>
              </div>

              {/* Handshake TTL Timer (5-minute fixed window) */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                <span className="text-[#686C74] flex items-center gap-1">
                  <Clock className="size-3 text-[#686C74]" />
                  Security Window:
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono font-bold ${
                      timeLeft <= 60 ? "text-rose-400 animate-pulse" : "text-emerald-400"
                    }`}
                  >
                    {Math.floor(timeLeft / 60).toString().padStart(2, "0")}:
                    {(timeLeft % 60).toString().padStart(2, "0")} remaining
                  </span>
                  {timeLeft <= 30 && (
                    <button
                      type="button"
                      onClick={handleRenewChallenge}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 underline"
                    >
                      Renew
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Active Session Selector (if multiple active sessions exist) */}
            {activeSessions.length > 1 && (
              <div className="mb-4 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#686C74] mb-1.5">
                  <Layers className="size-3 text-indigo-400" />
                  <span>Select Active Event:</span>
                </div>
                <select
                  value={selectedSessionId}
                  onChange={(e) => handleSessionChange(e.target.value)}
                  className="w-full bg-[#08090B] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {activeSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.sessionName} ({s.period} period)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2 mb-4">
                <AlertCircle className="size-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* STUDENT FORM ONLY */}
            <form onSubmit={handleStudentSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Registration Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 917621104001"
                  value={studentForm.studentRegNo}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, studentRegNo: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500 uppercase"
                />
                <span className="text-[10px] text-[#686C74] mt-0.5 block">
                  Limited to one submission per student and device
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Kumar"
                  value={studentForm.studentName}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, studentName: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Dept</label>
                  <select
                    value={studentForm.department}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, department: e.target.value })
                    }
                    className="w-full px-2 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Year</label>
                  <select
                    value={studentForm.year}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, year: Number(e.target.value) })
                    }
                    className="w-full px-2 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sec</label>
                  <select
                    value={studentForm.section}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, section: e.target.value })
                    }
                    className="w-full px-2 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting || timeLeft <= 0}
                className="w-full mt-2 py-2.5 text-xs font-bold bg-[#FF2A1A] hover:bg-[#FF2A1A] text-white rounded-xl shadow-lg transition-all disabled:opacity-50"
              >
                {submitting ? "Verifying & Recording..." : "Confirm Student Attendance"}
              </Button>
            </form>
          </div>
        )}

        {/* Footer Info inside the card box */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-[11px] text-[#686C74] flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <GraduationCap className="size-3.5 text-indigo-400" />
            <span>Coimbatore Institute of Engineering and Technology</span>
          </div>
          <span className="text-[10px] text-[#686C74]">
            Narasipuram (P.O), Thondamuthur (Via), Vellimalaipattinam, Coimbatore - 641109
          </span>
          <span className="text-[10px] text-indigo-400/80 font-mono">Ph: +91 422-2970703</span>
        </div>
      </div>
    </div>
  );
}

export default function StudentScanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-[#686C74]">
          Loading attendance verification...
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
