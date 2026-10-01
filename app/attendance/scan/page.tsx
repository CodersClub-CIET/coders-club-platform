"use client";

export const dynamic = "force-dynamic";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  HandshakeChallenge,
  StudentAttendanceSubmission,
  AssociateAttendanceSubmission,
  DEPARTMENTS,
} from "@/lib/attendance/types";
import { attendanceService } from "@/lib/attendance/attendance-service";
import {
  validateStudentSubmission,
  validateAssociateSubmission,
} from "@/lib/attendance/validation";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Clock,
  GraduationCap,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Moon,
  Sparkles,
  UserCheck,
} from "lucide-react";

const ASSOCIATE_ROLES = [
  "Club Executive",
  "Event Coordinator",
  "Technical Volunteer",
  "Design Lead",
  "Core Team Member",
] as const;

function ScanContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [attendeeMode, setAttendeeMode] = useState<"student" | "associate">("student");
  const [handshake, setHandshake] = useState<HandshakeChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes
  const [error, setError] = useState<string | null>(null);

  const [successRecord, setSuccessRecord] = useState<{
    name: string;
    identifier: string;
    type: "student" | "associate";
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

  // Associate Form State
  const [associateForm, setAssociateForm] = useState<{
    associateUserId: string;
    associateName: string;
    department: string;
    role: string;
  }>({
    associateUserId: "",
    associateName: "",
    department: "CSE",
    role: "Club Executive",
  });

  // 1. Perform server-authoritative handshake on load
  useEffect(() => {
    let isMounted = true;

    async function initHandshake() {
      if (!token) {
        setError("Invalid QR scan. Missing token parameter.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const challenge = await attendanceService.performHandshake(token);
        if (!isMounted) return;

        setHandshake(challenge);
        setTimeLeft(challenge.expiresInSeconds);
        setLoading(false);
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to verify attendance QR token.");
        setLoading(false);
      }
    }

    initHandshake();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // 2. Countdown timer for anti-replay challenge window (5 minutes)
  useEffect(() => {
    if (!handshake || successRecord || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError("Attendance submission window expired. Please scan the QR code again.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [handshake, successRecord, timeLeft]);

  // Handle Student Submission
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handshake) return;

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
      setSuccessRecord({
        name: record.studentName || studentForm.studentName,
        identifier: record.studentRegNo || studentForm.studentRegNo,
        type: "student",
        roleOrClass: `Year ${studentForm.year} (${studentForm.section.toUpperCase()})`,
        department: studentForm.department,
        markedAt: record.markedAt,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record attendance.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Associate Submission
  const handleAssociateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handshake) return;

    const payload: AssociateAttendanceSubmission = {
      challengeToken: handshake.challengeToken,
      associateUserId: associateForm.associateUserId.trim(),
      associateName: associateForm.associateName.trim(),
      department: associateForm.department,
      role: associateForm.role,
    };

    const validation = validateAssociateSubmission(payload);
    if (!validation.isValid) {
      setError(validation.errors[0]);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const record = await attendanceService.submitAssociateAttendance(payload);
      setSuccessRecord({
        name: record.associateName || associateForm.associateName,
        identifier: record.associateUserId || associateForm.associateUserId.toUpperCase(),
        type: "associate",
        roleOrClass: associateForm.role,
        department: associateForm.department,
        markedAt: record.markedAt,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record attendance.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4">
      {/* Container */}
      <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Brand Banner */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <QrCode className="size-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">CIET Coders Club</h1>
              <p className="text-[11px] text-slate-400">Attendance Verification Portal</p>
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
            <p className="text-xs text-slate-400 font-medium">Validating QR token & initiating handshake...</p>
          </div>
        ) : error && !handshake ? (
          /* Critical Error (invalid token or expired) */
          <div className="py-8 text-center flex flex-col items-center">
            <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-3">
              <ShieldAlert className="size-8" />
            </div>
            <h2 className="text-base font-bold text-white mb-1">Scan Validation Failed</h2>
            <p className="text-xs text-rose-300 max-w-xs mb-6">{error}</p>
            <p className="text-[11px] text-slate-400">
              Please ask the session coordinator to project the active QR code and scan again using your phone camera.
            </p>
          </div>
        ) : successRecord ? (
          /* Success Screen */
          <div className="py-8 text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
            <div
              className={`p-3 rounded-full mb-3 border ${
                successRecord.type === "associate"
                  ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                  : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              }`}
            >
              {successRecord.type === "associate" ? (
                <UserCheck className="size-10" />
              ) : (
                <CheckCircle2 className="size-10" />
              )}
            </div>
            <h2 className="text-xl font-extrabold text-white mb-1">
              {successRecord.type === "associate"
                ? "Associate Check-in Confirmed!"
                : "Attendance Confirmed!"}
            </h2>
            <p
              className={`text-xs font-medium mb-6 ${
                successRecord.type === "associate" ? "text-purple-300" : "text-emerald-300"
              }`}
            >
              Your presence has been recorded successfully.
            </p>

            <div className="w-full bg-slate-900/60 rounded-2xl p-4 border border-slate-700/50 text-left space-y-2 mb-6">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Attendee:</span>
                <span className="font-semibold text-white">{successRecord.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">
                  {successRecord.type === "associate" ? "Associate ID:" : "Reg Number:"}
                </span>
                <span className="font-mono font-semibold text-indigo-300">
                  {successRecord.identifier}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">
                  {successRecord.type === "associate" ? "Role:" : "Class:"}
                </span>
                <span
                  className={
                    successRecord.type === "associate"
                      ? "px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "font-medium text-slate-200"
                  }
                >
                  {successRecord.roleOrClass}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Department:</span>
                <span className="font-medium text-slate-200">{successRecord.department}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Event:</span>
                <span className="font-medium text-slate-200">{handshake?.eventName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Period:</span>
                <span className="capitalize font-medium text-amber-400">{handshake?.period}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Time Marked:</span>
                <span className="font-mono text-slate-400">
                  {new Date(successRecord.markedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Sparkles className="size-3.5 text-indigo-400" />
              <span>You may now close this browser tab.</span>
            </div>
          </div>
        ) : (
          /* Submission Form */
          <div>
            {/* Event Summary Card */}
            <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-700/50 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-indigo-400">{handshake?.eventName}</span>
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
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="size-3 text-slate-400" />
                  Security Window:
                </span>
                <span
                  className={`font-mono font-bold ${
                    timeLeft <= 60 ? "text-rose-400 animate-pulse" : "text-emerald-400"
                  }`}
                >
                  {Math.floor(timeLeft / 60).toString().padStart(2, "0")}:
                  {(timeLeft % 60).toString().padStart(2, "0")} remaining
                </span>
              </div>
            </div>

            {/* Segmented Mode Selector: Student vs Associate */}
            <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-700/80 mb-4">
              <button
                type="button"
                onClick={() => {
                  setAttendeeMode("student");
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  attendeeMode === "student"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <GraduationCap className="size-4" />
                Student Check-in
              </button>
              <button
                type="button"
                onClick={() => {
                  setAttendeeMode("associate");
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  attendeeMode === "associate"
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Briefcase className="size-4" />
                Associate Check-in
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2 mb-4">
                <AlertCircle className="size-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form Rendering by Mode */}
            {attendeeMode === "student" ? (
              /* STUDENT FORM */
              <form onSubmit={handleStudentSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 917621104001"
                    value={studentForm.studentRegNo}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, studentRegNo: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Kumar"
                    value={studentForm.studentName}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, studentName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
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
                      className="w-full px-2 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
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
                      className="w-full px-2 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value={1}>1st</option>
                      <option value={2}>2nd</option>
                      <option value={3}>3rd</option>
                      <option value={4}>4th</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Sec</label>
                    <select
                      value={studentForm.section}
                      onChange={(e) =>
                        setStudentForm({ ...studentForm, section: e.target.value })
                      }
                      className="w-full px-2 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
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
                  className="w-full mt-2 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {submitting ? "Verifying & Recording..." : "Confirm Student Attendance"}
                </Button>
              </form>
            ) : (
              /* ASSOCIATE FORM */
              <form onSubmit={handleAssociateSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Associate ID / Reg No
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CIET-ASSOC-101 or 917621..."
                    value={associateForm.associateUserId}
                    onChange={(e) =>
                      setAssociateForm({ ...associateForm, associateUserId: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white font-mono placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gowtham R"
                    value={associateForm.associateName}
                    onChange={(e) =>
                      setAssociateForm({ ...associateForm, associateName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Club Role
                    </label>
                    <select
                      value={associateForm.role}
                      onChange={(e) =>
                        setAssociateForm({ ...associateForm, role: e.target.value })
                      }
                      className="w-full px-2.5 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                    >
                      {ASSOCIATE_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Department
                    </label>
                    <select
                      value={associateForm.department}
                      onChange={(e) =>
                        setAssociateForm({ ...associateForm, department: e.target.value })
                      }
                      className="w-full px-2.5 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting || timeLeft <= 0}
                  className="w-full mt-2 py-2.5 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {submitting ? "Verifying & Recording..." : "Confirm Associate Attendance"}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 text-center text-[11px] text-slate-500 flex flex-col items-center gap-0.5">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium">
          <GraduationCap className="size-3.5 text-indigo-400" />
          <span>Coimbatore Institute of Engineering and Technology</span>
        </div>
        <span className="text-[10px] text-slate-500">
          Narasipuram (P.O), Thondamuthur (Via), Vellimalaipattinam, Coimbatore - 641109
        </span>
      </div>
    </div>
  );
}

export default function StudentScanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-xs text-slate-400">
          Loading attendance verification...
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
