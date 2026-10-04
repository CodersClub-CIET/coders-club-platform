"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  consumeAttendanceChallenge,
  getAttendanceSession,
} from "@/lib/dynamic-qr/client";
import {
  type QRAttendanceSession,
  type ConsumeChallengeResponse,
  QRErrorCode,
} from "@/lib/dynamic-qr/types";
import { useAuth } from "@/lib/auth/use-auth";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  GraduationCap,
  Briefcase,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

function ScanFlowContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sid");
  const challengeToken = searchParams.get("token");

  const { user, isAuthenticated } = useAuth();

  const [session, setSession] = useState<QRAttendanceSession | null>(null);
  const [loadingSession, setLoadingSession] = useState<boolean>(
    Boolean(sessionId)
  );
  const [sessionError, setSessionError] = useState<string | null>(
    sessionId
      ? null
      : "No attendance session identifier found in QR code."
  );

  // Student Form State
  const [regNumber, setRegNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState(
    "Computer Science & Engineering"
  );

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] =
    useState<ConsumeChallengeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load session information
  useEffect(() => {
    if (!sessionId) return;

    let active = true;

    getAttendanceSession(sessionId)
      .then((data) => {
        if (active) {
          setSession(data);
          setLoadingSession(false);
        }
      })
      .catch((err) => {
        if (active) {
          setSessionError(
            err?.message || "Failed to load session context."
          );
          setLoadingSession(false);
        }
      });

    return () => {
      active = false;
    };
  }, [sessionId]);

  // Compute a client fingerprint for scanner replay auditing
  const getDeviceFingerprint = () => {
    if (typeof window === "undefined") {
      return "server-render";
    }

    const nav = window.navigator;

    const str = `${nav.userAgent}-${nav.language}-${window.screen.width}x${window.screen.height}`;

    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }

    return `fp-${Math.abs(hash).toString(16)}`;
  };

  async function handleStudentSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!sessionId || !challengeToken) {
      setErrorMessage(
        "Incomplete QR challenge token. Please rescan the QR code."
      );
      return;
    }

    if (!regNumber.trim() || !fullName.trim()) {
      setErrorMessage(
        "Please enter both your Register / Roll Number and Full Name."
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await consumeAttendanceChallenge({
        session_id: sessionId,
        challenge_token: challengeToken,
        attendee_type: "student",
        student_reg_number: regNumber.trim(),
        student_name: fullName.trim(),
        student_email: email.trim() || undefined,
        student_department: department,
        scanner_fingerprint: getDeviceFingerprint(),
      });

      setResult(response);

      if (!response.success) {
        setErrorMessage(response.message);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to record attendance";

      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssociateSubmit() {
    if (!sessionId || !challengeToken) {
      setErrorMessage("Incomplete QR challenge token. Please rescan.");
      return;
    }

    if (!isAuthenticated || !user?.id) {
      setErrorMessage(
        "Please sign in with your Associate account before recording attendance."
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await consumeAttendanceChallenge({
        session_id: sessionId,
        challenge_token: challengeToken,
        attendee_type: "associate",
        associate_id: user.id,
        associate_email: user.email || email.trim() || undefined,
        scanner_fingerprint: getDeviceFingerprint(),
      });

      setResult(response);

      if (!response.success) {
        setErrorMessage(response.message);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to record associate attendance";

      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>

        <p className="mt-4 text-sm font-medium text-gray-600">
          Validating attendance challenge...
        </p>
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle className="h-8 w-8" />
          </div>

          <h2 className="mt-4 text-xl font-bold text-gray-900">
            Invalid QR Code
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            {sessionError ||
              "The scanned QR code is malformed or no longer exists on the platform."}
          </p>
        </div>
      </div>
    );
  }

  // Success view
  if (result?.success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-3xl border border-green-100 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            <Sparkles className="h-3.5 w-3.5" />
            Verified by Server
          </span>

          <h2 className="mt-3 text-2xl font-bold text-gray-900">
            Attendance Recorded!
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Your attendance has been securely registered in the Coders Club
            platform.
          </p>

          <div className="mt-6 space-y-2.5 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Attendee:</span>

              <span className="font-semibold text-gray-900">
                {result.record?.student_name ||
                  result.record?.associate_name ||
                  fullName ||
                  user?.email ||
                  "Participant"}
              </span>
            </div>

            {result.record?.student_reg_number && (
              <div className="flex justify-between">
                <span className="text-gray-500">Register No:</span>

                <span className="font-mono font-medium text-gray-900">
                  {result.record.student_reg_number}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-500">Event:</span>

              <span className="text-right font-medium text-gray-900">
                {session.event_name}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Context:</span>

              <span className="font-medium text-indigo-700">
                {session.attendance_context}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Timestamp:</span>

              <span className="text-xs text-gray-600">
                {result.record?.marked_at
                  ? new Date(
                      result.record.marked_at
                    ).toLocaleTimeString()
                  : new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs text-gray-400">
              Session Code: {session.session_code} • Challenge Consumed
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isSessionEnded = session.status === "ended";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-6 shadow-xl sm:p-8">
        {/* Header */}
        <div className="border-b border-gray-100 pb-5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {session.target_role === "student" ? (
                <>
                  <GraduationCap className="h-3.5 w-3.5" />
                  Student Attendance
                </>
              ) : (
                <>
                  <Briefcase className="h-3.5 w-3.5" />
                  Associate Attendance
                </>
              )}
            </span>

            <span className="font-mono text-xs text-gray-400">
              {session.session_code}
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            {session.event_name}
          </h1>

          {session.sub_event_name && (
            <p className="mt-1 text-sm font-medium text-indigo-600">
              Track: {session.sub_event_name}
            </p>
          )}

          <p className="mt-1 text-xs text-gray-500">
            Attendance Context:{" "}
            <span className="font-semibold text-gray-700">
              {session.attendance_context}
            </span>
          </p>
        </div>

        {/* Ended Session Notice */}
        {isSessionEnded && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

            <div>
              <p className="font-semibold">
                Attendance Session Ended
              </p>

              <p className="mt-0.5 text-xs text-amber-700">
                The coordinator has closed this attendance session. New
                submissions are no longer accepted.
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {errorMessage && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

            <div>
              <p className="font-semibold">
                Attendance Submission Failed
              </p>

              <p className="mt-0.5 text-xs text-red-700">
                {errorMessage}
              </p>

              {result?.error_code ===
                QRErrorCode.CHALLENGE_EXPIRED && (
                <p className="mt-2 text-xs font-medium text-red-800 underline">
                  Please scan the newly refreshed QR code shown on the
                  screen.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Student Scan Form */}
        {session.target_role === "student" && !isSessionEnded && (
          <form
            onSubmit={handleStudentSubmit}
            className="mt-6 space-y-4"
          >
            <div>
              <label
                htmlFor="regNo"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-700"
              >
                Register Number / Roll Number *
              </label>

              <input
                id="regNo"
                type="text"
                required
                placeholder="e.g. 71762105001"
                value={regNumber}
                onChange={(e) =>
                  setRegNumber(e.target.value.toUpperCase())
                }
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-700"
              >
                Student Full Name *
              </label>

              <input
                id="fullName"
                type="text"
                required
                placeholder="e.g. John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label
                htmlFor="dept"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-700"
              >
                Department / Branch
              </label>

              <select
                id="dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="Computer Science & Engineering">
                  Computer Science & Engineering
                </option>

                <option value="Information Technology">
                  Information Technology
                </option>

                <option value="Artificial Intelligence & Data Science">
                  Artificial Intelligence & Data Science
                </option>

                <option value="Electronics & Communication Engineering">
                  Electronics & Communication Engineering
                </option>

                <option value="Electrical & Electronics Engineering">
                  Electrical & Electronics Engineering
                </option>

                <option value="Mechanical Engineering">
                  Mechanical Engineering
                </option>

                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-700"
              >
                Email Address (Optional)
              </label>

              <input
                id="email"
                type="email"
                placeholder="student@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Verifying Challenge...
                  </>
                ) : (
                  <>
                    Mark Attendance
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Associate Scan View */}
        {session.target_role === "associate" && !isSessionEnded && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                Associate Verification
              </p>

              <p className="mt-1 text-sm text-gray-700">
                {isAuthenticated
                  ? `Signed in as ${user?.email}`
                  : "Please sign in with your authorized Associate account."}
              </p>
            </div>

            {!isAuthenticated && (
              <div>
                <label
                  htmlFor="assocEmail"
                  className="block text-xs font-semibold uppercase tracking-wider text-gray-700"
                >
                  Associate Email Address
                </label>

                <input
                  id="assocEmail"
                  type="email"
                  placeholder="associate@codersclub.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleAssociateSubmit}
              disabled={submitting || !isAuthenticated || !user?.id}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Verifying Associate Attendance...
                </>
              ) : (
                <>
                  Confirm Associate Attendance
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}

        <div className="mt-8 border-t border-gray-100 pt-4 text-center">
          <p className="text-[11px] text-gray-400">
            Server-Authoritative Anti-Replay Verification • Coders Club
            Platform
          </p>
        </div>
      </div>
    </main>
  );
}

export default function DynamicQRScanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
          Loading scan verification portal...
        </div>
      }
    >
      <ScanFlowContent />
    </Suspense>
  );
}