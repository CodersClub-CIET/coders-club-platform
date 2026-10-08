 "use client";

import React from "react";
import { StudentAcademicContext } from "@/lib/performance/types";
import { GraduationCap, Info } from "lucide-react";

interface StudentAcademicCardProps {
  department: string;
  year: number;
  section: string;
  academicContext?: StudentAcademicContext;
}

export default function StudentAcademicCard({
  department,
  year,
  section,
  academicContext,
}: StudentAcademicCardProps) {
  const hasCgpa = typeof academicContext?.cgpa === "number";
  const hasSemester = typeof academicContext?.currentSemester === "number";
  const hasBatch = Boolean(academicContext?.batch?.trim());
  const hasMentor = Boolean(academicContext?.mentorName?.trim());

  return (
    <div className="bg-[#111318] rounded-2xl border border-[#292D33] p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#292D33] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="size-5 text-[#FF2A1A]" />
            <h3 className="text-base font-bold text-[#F3F1EC]">
              Academic Context
            </h3>
          </div>
          <p className="text-xs text-[#686C74] mt-0.5">
            Current institutional enrollment and academic details
          </p>
        </div>
      </div>

      {/* Current Verified Institutional Context Grid */}
      <div>
        <h4 className="text-xs font-bold text-[#9B9EA6] uppercase tracking-wider mb-3">
          Current Academic Standing
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Department */}
          <div className="bg-[#08090B] rounded-xl p-4 border border-[#292D33]">
            <span className="text-xs font-medium text-[#686C74] block mb-1">
              Department
            </span>
            <span className="text-xl font-extrabold text-[#F3F1EC] block">
              {department || "N/A"}
            </span>
            <span className="text-[11px] text-[#686C74] mt-0.5 block">
              Discipline
            </span>
          </div>

          {/* Current Year */}
          <div className="bg-[#08090B] rounded-xl p-4 border border-[#292D33]">
            <span className="text-xs font-medium text-[#686C74] block mb-1">
              Current Year
            </span>
            <span className="text-xl font-extrabold text-[#F3F1EC] block">
              {year ? `Year ${year}` : "N/A"}
            </span>
            <span className="text-[11px] text-[#686C74] mt-0.5 block">
              Academic Standing
            </span>
          </div>

          {/* Section */}
          <div className="bg-[#08090B] rounded-xl p-4 border border-[#292D33]">
            <span className="text-xs font-medium text-[#686C74] block mb-1">
              Section
            </span>
            <span className="text-xl font-extrabold text-[#F3F1EC] block">
              {section ? `Section ${section}` : "N/A"}
            </span>
            <span className="text-[11px] text-[#686C74] mt-0.5 block">
              Class Division
            </span>
          </div>
        </div>
      </div>

      {/* Extended Academic Record Fields (Contract Status) */}
      <div>
        <h4 className="text-xs font-bold text-[#9B9EA6] uppercase tracking-wider mb-3">
          Institutional Academic Records
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* CGPA */}
          <div className="p-3 rounded-xl bg-[#08090B] border border-[#292D33] flex items-center justify-between">
            <span className="font-medium text-[#9B9EA6]">Cumulative GPA (CGPA)</span>
            {hasCgpa ? (
              <span className="font-bold text-[#F3F1EC]">{academicContext!.cgpa}</span>
            ) : (
              <span className="text-[11px] text-[#686C74] italic">
                Pending backend contract
              </span>
            )}
          </div>

          {/* Semester */}
          <div className="p-3 rounded-xl bg-[#08090B] border border-[#292D33] flex items-center justify-between">
            <span className="font-medium text-[#9B9EA6]">Current Semester</span>
            {hasSemester ? (
              <span className="font-bold text-[#F3F1EC]">
                Semester {academicContext!.currentSemester}
              </span>
            ) : (
              <span className="text-[11px] text-[#686C74] italic">
                Pending backend contract
              </span>
            )}
          </div>

          {/* Batch */}
          <div className="p-3 rounded-xl bg-[#08090B] border border-[#292D33] flex items-center justify-between">
            <span className="font-medium text-[#9B9EA6]">Academic Batch</span>
            {hasBatch ? (
              <span className="font-bold text-[#F3F1EC]">{academicContext!.batch}</span>
            ) : (
              <span className="text-[11px] text-[#686C74] italic">
                Pending backend contract
              </span>
            )}
          </div>

          {/* Mentor */}
          <div className="p-3 rounded-xl bg-[#08090B] border border-[#292D33] flex items-center justify-between">
            <span className="font-medium text-[#9B9EA6]">Faculty Mentor</span>
            {hasMentor ? (
              <span className="font-bold text-[#F3F1EC]">{academicContext!.mentorName}</span>
            ) : (
              <span className="text-[11px] text-[#686C74] italic">
                Pending backend contract
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Backend Contract Status Note */}
      <div className="rounded-xl bg-[#08090B] border border-[#292D33]/80 p-3.5 flex items-start gap-2.5 text-xs text-[#686C74]">
        <Info className="size-4 text-[#686C74] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-semibold text-[#9B9EA6]">Backend contract required:</span> Multi-semester academic transcripts, verified CGPA records, and faculty mentor mapping will populate once the backend team provides the college academic records schema in Supabase.
        </p>
      </div>
    </div>
  );
}
