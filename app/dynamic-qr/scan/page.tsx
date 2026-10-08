"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  consumeAttendanceChallenge,
  getScannerContext,
} from "@/lib/dynamic-qr/client";
import {
  type ScanContext,
  type ConsumeChallengeResponse,
} from "@/lib/dynamic-qr/types";
import { useAuth } from "@/lib/auth/use-auth";
import {
  CheckCircle2,
  AlertCircle,
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

  const { user, isAuthenticated, isAuthorized, role, loading: authLoading } = useAuth();
  const canRecordAssociate = !authLoading && isAuthenticated && isAuthorized && role === "associate" && !!user?.id;

  const [session, setSession] = useState<ScanContext | null>(null);
  const [loadingSession, setLoadingSession] = useState<boolean>(
    Boolean(sessionId && challengeToken)
  );
  const [sessionError, setSessionError] = useState<string | null>(
    sessionId && challengeToken
      ? null
      : "No attendance session identifier found in QR code."
  );

  // Student Form State
  const [regNumber, setRegNumber] = useState("");
  // Submission State
  const submitRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] =
    useState<ConsumeChallengeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load session information
  useEffect(() => {
    if (!sessionId || !challengeToken) return;

    let active = true;

    getScannerContext(sessionId, challengeToken)
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
  }, [sessionId, challengeToken]);

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

    if (!regNumber.trim()) {
      setErrorMessage(
        "Please enter your Register / Roll Number."
      );
      return;
    }

    if (submitRef.current) return;
    submitRef.current = true; setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await consumeAttendanceChallenge({
        challenge_token:challengeToken, register_number:regNumber.trim(), device_hash:getDeviceFingerprint(),
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
      submitRef.current = false; setSubmitting(false);
    }
  }

  function handleAssociateSubmit() {
    setErrorMessage("Associate attendance consumption is deferred. Proposal 002 has not been approved or deployed.");
  }

  if (loadingSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>

        <p className="mt-4 text-sm font-medium text-[#9B9EA6]">
          Validating attendance challenge...
        </p>
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-[#111318] p-8 text-center shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle className="h-8 w-8" />
          </div>

          <h2 className="mt-4 text-xl font-bold text-[#F3F1EC]">
            Invalid QR Code
          </h2>

          <p className="mt-2 text-sm text-[#9B9EA6]">
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#08090B] p-6">
        <div className="w-full max-w-md rounded-3xl border border-green-100 bg-[#111318] p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            <Sparkles className="h-3.5 w-3.5" />
            Verified by Server
          </span>

          <h2 className="mt-3 text-2xl font-bold text-[#F3F1EC]">
            Attendance Recorded!
          </h2>

          <p className="mt-1 text-sm text-[#686C74]">
            Your attendance has been securely registered in the Coders Club
            platform.
          </p>

          <div className="mt-6 space-y-2.5 rounded-2xl border border-gray-100 bg-[#08090B] p-4 text-left text-sm">
            <p>Register number: {regNumber}</p>
            <p>Event: {session.event_name}</p>
            <p>Context: {session.attendance_context}</p>
            <p className="break-all">Record ID: {result.attendance_record_id}</p>
          </div>

          <div className="mt-6">
            <p className="text-xs text-gray-400">
              Session ID: {session.session_id} • Challenge Consumed
            </p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#08090B] px-4 py-8">
      <div className="w-full max-w-lg rounded-3xl border border-gray-100 bg-[#111318] p-6 shadow-xl sm:p-8">
        {/* Header */}
        <div className="border-b border-gray-100 pb-5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF2A1A]/10 px-3 py-1 text-xs font-semibold text-indigo-700">
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
              {session.session_id}
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-bold text-[#F3F1EC]">
            {session.event_name}
          </h1>

          <p className="mt-1 text-xs text-[#686C74]">
            Attendance Context:{" "}
            <span className="font-semibold text-gray-700">
              {session.attendance_context}
            </span>
          </p>
        </div>

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

              {result?.code === "CHALLENGE_EXPIRED" && (
                <p className="mt-2 text-xs font-medium text-red-800 underline">
                  Please scan the newly refreshed QR code shown on the
                  screen.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Student Scan Form */}
        {session.target_role === "student" && (
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
                className="mt-1.5 w-full rounded-xl border border-[#292D33] px-4 py-2.5 text-sm font-medium text-[#F3F1EC] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <p className="text-xs text-[#686C74]">Your existing student record is verified by register number. No new student record is created.</p>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF2A1A] px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#C51D16] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
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
        {session.target_role === "associate" && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-indigo-100 bg-[#FF2A1A]/10/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                Associate Verification
              </p>

              <p className="mt-1 text-sm text-gray-700">
                {authLoading ? "Checking your account..." : canRecordAssociate
                  ? `Signed in as ${user?.email}`
                  : "An active Associate profile is required. Student scanning remains public."}
              </p>
            </div>

            <p className="text-sm text-[#9B9EA6]">Associate attendance consumption is deferred; Proposal 002 is not deployed.</p>

            <button
              type="button"
              onClick={handleAssociateSubmit}
              disabled={true}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF2A1A] px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#C51D16] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
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
        <div className="flex min-h-screen items-center justify-center text-sm text-[#686C74]">
          Loading scan verification portal...
        </div>
      }
    >
      <ScanFlowContent />
    </Suspense>
  );
}