"use client";

export const dynamic = "force-dynamic";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { HandshakeChallenge, StudentAttendanceSubmission } from "@/lib/attendance/types";
import { attendanceService } from "@/lib/attendance/attendance-service";
import { validateStudentSubmission } from "@/lib/attendance/validation";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  GraduationCap,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";

function ScanContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [handshake, setHandshake] = useState<HandshakeChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes
  const [error, setError] = useState<string | null>(null);
  const [successRecord, setSuccessRecord] = useState<{
    name: string;
    regNo: string;
    markedAt: string;
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
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

  // 2. Countdown timer for anti-replay challenge window
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

  // Handle Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handshake) return;

    const payload: StudentAttendanceSubmission = {
      challengeToken: handshake.challengeToken,
      studentRegNo: formData.studentRegNo.trim(),
      studentName: formData.studentName.trim(),
      department: formData.department,
      year: Number(formData.year),
      section: formData.section.toUpperCase(),
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
        name: record.studentName || formData.studentName,
        regNo: record.studentRegNo || formData.studentRegNo,
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
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <QrCode className="size-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">CIET Coders Club</h1>
              <p className="text-[11px] text-slate-400">Student Attendance Verification</p>
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
            <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-3">
              <CheckCircle2 className="size-10" />
            </div>
            <h2 className="text-xl font-extrabold text-white mb-1">Attendance Confirmed!</h2>
            <p className="text-xs text-emerald-300 font-medium mb-6">
              Your presence has been recorded successfully.
            </p>

            <div className="w-full bg-slate-900/60 rounded-2xl p-4 border border-slate-700/50 text-left space-y-2 mb-6">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Student Name:</span>
                <span className="font-semibold text-white">{successRecord.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Reg Number:</span>
                <span className="font-mono font-semibold text-indigo-300">{successRecord.regNo}</span>
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
            <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-700/50 mb-5">
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

              {/* Handshake TTL Timer */}
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

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2 mb-4">
                <AlertCircle className="size-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Registration Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 917621104001"
                  value={formData.studentRegNo}
                  onChange={(e) => setFormData({ ...formData, studentRegNo: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Kumar"
                  value={formData.studentName}
                  onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Dept</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="CSE">CSE</option>
                    <option value="IT">IT</option>
                    <option value="AI&DS">AI & DS</option>
                    <option value="AI&ML">AI & ML</option>
                    <option value="Cyber Security">Cyber Security</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Year</label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
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
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
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
                {submitting ? "Verifying & Recording..." : "Submit Attendance"}
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 text-center text-[11px] text-slate-500 flex items-center gap-1">
        <GraduationCap className="size-3.5" />
        <span>Coimbatore Institute of Engineering and Technology</span>
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
