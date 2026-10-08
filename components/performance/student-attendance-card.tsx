"use client";

import React from "react";
import { StudentAttendanceSummary } from "@/lib/attendance/types";
import {
  Clock,
  QrCode,
  UserCheck,
  AlertCircle,
} from "lucide-react";

interface StudentAttendanceCardProps {
  attendance?: StudentAttendanceSummary | null;
}

export default function StudentAttendanceCard({
  attendance,
}: StudentAttendanceCardProps) {
  // Empty or unavailable state
  if (!attendance || attendance.totalSessions === 0) {
    return (
      <div className="bg-[#111318] rounded-2xl border border-[#292D33] p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="size-5 text-[#FF2A1A]" />
          <h3 className="text-base font-bold text-[#F3F1EC]">
            Attendance Performance
          </h3>
        </div>
        <div className="text-center py-8">
          <AlertCircle className="size-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-[#9B9EA6]">
            No attendance records found
          </p>
          <p className="text-xs text-[#686C74] mt-1">
            Participation scans recorded in active sessions will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111318] rounded-2xl border border-[#292D33] p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#292D33] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="size-5 text-[#FF2A1A]" />
            <h3 className="text-base font-bold text-[#F3F1EC]">
              Attendance Performance
            </h3>
          </div>
          <p className="text-xs text-[#686C74] mt-0.5">
            Verified attendance records from club sessions
          </p>
        </div>
      </div>

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Attendance Rate */}
        <div className="bg-[#08090B] rounded-xl p-4 border border-[#292D33]">
          <span className="text-xs font-medium text-[#686C74] block mb-1">
            Attendance Rate
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#FF2A1A]">
              {attendance.attendanceRate}%
            </span>
          </div>
        </div>

        {/* Sessions Attended */}
        <div className="bg-[#08090B] rounded-xl p-4 border border-[#292D33]">
          <span className="text-xs font-medium text-[#686C74] block mb-1">
            Sessions Attended
          </span>
          <span className="text-2xl font-extrabold text-[#F3F1EC]">
            {attendance.sessionsAttended}
          </span>
          <span className="text-xs text-[#686C74] ml-1">
            / {attendance.totalSessions} total
          </span>
        </div>

        {/* Recorded Sessions Count */}
        <div className="bg-[#08090B] rounded-xl p-4 border border-[#292D33]">
          <span className="text-xs font-medium text-[#686C74] block mb-1">
            Recorded Sessions
          </span>
          <span className="text-2xl font-extrabold text-[#F3F1EC]">
            {attendance.history.length}
          </span>
          <span className="text-xs text-[#686C74] ml-1">entries logged</span>
        </div>
      </div>

      {/* Session History Breakdown */}
      <div>
        <h4 className="text-xs font-bold text-[#9B9EA6] uppercase tracking-wider mb-3">
          Session Participation History
        </h4>

        {attendance.history.length === 0 ? (
          <p className="text-xs text-[#686C74] italic">
            No specific session history available.
          </p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {attendance.history.map((record, index) => (
              <div
                key={`${record.sessionId}-${index}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-[#08090B] border border-[#292D33] text-xs gap-2"
              >
                <div className="space-y-0.5">
                  <span className="font-semibold text-[#F3F1EC] block">
                    {record.sessionName}
                  </span>
                  <span className="text-[11px] text-[#686C74] block">
                    {record.eventName} &bull;{" "}
                    <span className="capitalize">{record.period}</span> Session
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1 text-[11px] text-[#686C74]">
                    <Clock className="size-3 text-[#686C74]" />
                    <span>
                      {new Date(record.markedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FF2A1A]/10 text-indigo-700 border border-indigo-200">
                    <QrCode className="size-3" />
                    {record.verificationMethod === "qr_scan"
                      ? "QR Scan"
                      : "Manual"}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                      record.status === "present"
                        ? "bg-emerald-100 text-emerald-800"
                        : record.status === "late"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {record.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
