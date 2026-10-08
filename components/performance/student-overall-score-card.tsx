"use client";

import React from "react";
import { StudentAttendanceSummary } from "@/lib/attendance/types";
import { EventScoreRecord } from "@/app/types/score";
import { Trophy, CalendarCheck, Award, Info } from "lucide-react";

interface StudentOverallScoreCardProps {
  attendance?: StudentAttendanceSummary | null;
  scores?: EventScoreRecord[];
}

export default function StudentOverallScoreCard({
  attendance,
  scores = [],
}: StudentOverallScoreCardProps) {
  const attendanceRate = attendance?.attendanceRate;
  const totalEvents = scores.length;

  return (
    <div className="bg-[#111318] rounded-2xl border border-[#292D33] p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#292D33] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-[#FF2A1A]" />
            <h3 className="text-base font-bold text-[#F3F1EC]">
              Overall Performance Summary
            </h3>
          </div>
          <p className="text-xs text-[#686C74] mt-0.5">
            Authoritative platform performance standing
          </p>
        </div>

        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#171A20] text-[#9B9EA6] border border-[#292D33]">
          <Info className="size-3 text-[#686C74]" />
          Composite Engine Pending
        </span>
      </div>

      {/* Primary Verified Metrics (Zero Derived Calculations) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Verified Attendance Rate */}
        <div className="bg-[#08090B] rounded-xl p-4 border border-[#292D33] flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[#FF2A1A]/10 border border-indigo-100 text-[#FF2A1A] shrink-0">
            <CalendarCheck className="size-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-[#686C74] block">
              Authoritative Attendance Rate
            </span>
            <span className="text-2xl font-extrabold text-[#FF2A1A] block mt-0.5">
              {typeof attendanceRate === "number" ? `${attendanceRate}%` : "N/A"}
            </span>
            <span className="text-[11px] text-[#686C74] mt-0.5 block">
              Provided by Attendance Module
            </span>
          </div>
        </div>

        {/* Verified Events Count */}
        <div className="bg-[#08090B] rounded-xl p-4 border border-[#292D33] flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 shrink-0">
            <Award className="size-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-[#686C74] block">
              Evaluated Event Entries
            </span>
            <span className="text-2xl font-extrabold text-[#F3F1EC] block mt-0.5">
              {totalEvents}
            </span>
            <span className="text-[11px] text-[#686C74] mt-0.5 block">
              {totalEvents === 1 ? "1 contest record" : `${totalEvents} contest records`}
            </span>
          </div>
        </div>
      </div>

      {/* Composite Overall Score Status Banner */}
      <div className="rounded-xl bg-[#FF2A1A]/10/60 border border-indigo-100 p-4">
        <div className="flex items-start gap-3">
          <Info className="size-5 text-[#FF2A1A] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
              Composite Overall Score: Awaiting Backend Contract
            </h4>
            <p className="text-xs text-indigo-800/80 leading-relaxed">
              The platform uses server-authoritative scoring. No duplicate client-side scoring formulas, averages, or weighting models are applied in Student Performance. The combined composite score will appear here once the backend team provides the authoritative scoring contract.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
