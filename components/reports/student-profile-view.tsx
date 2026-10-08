"use client";

import React, { useState } from "react";
import { reportService } from "@/lib/reports/report-service";
import type { StudentPerformanceProfile } from "@/lib/reports/types";
import { generateStudentProfileCSV, downloadCSV } from "@/lib/reports/export-utils";
import ReportPrintModal from "./report-print-modal";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import {
  Search,
  GraduationCap,
  Download,
  Printer,
  CheckCircle2,
  XCircle,
  Trophy,
  Calendar,
  Clock,
  QrCode,
  User,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function StudentProfileView() {
  const [searchRegNo, setSearchRegNo] = useState("");
  const [profile, setProfile] = useState<StudentPerformanceProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchRegNo.trim();
    if (!query) {
      toast.warning("Please enter a student register number.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setHasSearched(true);
      const result = await reportService.getStudentPerformanceProfile(query);
      setProfile(result);
      if (!result) {
        toast.info(`No attendance records found for "${query}".`);
      } else {
        toast.success(`Loaded profile for ${result.studentName}.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load student profile.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    try {
      if (!profile) return;
      const csv = generateStudentProfileCSV(profile);
      downloadCSV(csv, `student_profile_${profile.studentRegNo}`);
      toast.success("Student profile CSV downloaded successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to export CSV.";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header Card */}
      <div className="bg-[#111318] rounded-xl border border-[#292D33] p-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="size-4 text-[#9B9EA6] absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Enter Student Register Number (e.g., 917621104001 or 7100...)"
              value={searchRegNo}
              onChange={(e) => setSearchRegNo(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#0D0F12] border border-[#292D33] text-[#F3F1EC] rounded-lg focus:outline-none focus:border-[#FF2A1A]/50 text-sm placeholder:text-[#686C74]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-[#FF2A1A] hover:bg-[#C51D16] text-white font-mono text-[11px] uppercase tracking-wider px-5 py-2 rounded-lg border-0"
            >
              <Search className="size-3.5 mr-1.5" />
              <span>Lookup Profile</span>
            </Button>

            {profile && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="bg-[#FF2A1A] hover:bg-[#C51D16] text-white font-mono text-[11px] uppercase tracking-wider px-4 py-2 rounded-lg border-0"
                >
                  <Download className="size-3.5 mr-1.5" />
                  <span className="hidden sm:inline">Export</span> CSV
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="bg-[#0D0F12] hover:bg-[#1D2026] text-[#F3F1EC] font-mono text-[11px] uppercase tracking-wider px-4 py-2 rounded-lg border border-[#292D33]"
                >
                  <Printer className="size-3.5 mr-1.5" />
                  <span className="hidden sm:inline">Print</span> Sheet
                </Button>
              </>
            )}
          </div>
        </form>
      </div>

      {/* Main Profile View / States */}
      {loading ? (
        <div className="bg-[#111318] rounded-xl border border-[#292D33] py-20 flex flex-col items-center justify-center">
          <Loading label="Retrieving student attendance history & competition scores..." />
        </div>
      ) : error ? (
        <div className="bg-[#111318] rounded-xl border border-[#292D33] p-8 text-center space-y-3">
          <div className="size-12 rounded-full bg-[#FF2A1A]/10 text-[#FF2A1A] flex items-center justify-center mx-auto border border-[#FF2A1A]/20">
            <AlertCircle className="size-6" />
          </div>
          <h3 className="text-sm font-bold text-[#F3F1EC]">Search Error</h3>
          <p className="text-xs text-[#9B9EA6] max-w-md mx-auto">{error}</p>
        </div>
      ) : !hasSearched ? (
        <div className="bg-[#111318] rounded-xl border border-[#292D33] py-16 text-center text-[#686C74]">
          <GraduationCap className="size-10 mx-auto mb-3 text-[#3A3E45]" />
          <h3 className="text-sm font-bold text-[#F3F1EC]">Student Comprehensive Record Lookup</h3>
          <p className="text-xs text-[#9B9EA6] max-w-md mx-auto mt-1">
            Search any student by register number to view their verified session attendances, On-Duty eligibility status, and event competition marks.
          </p>
        </div>
      ) : !profile ? (
        <div className="bg-[#111318] rounded-xl border border-[#292D33] py-16 text-center text-[#686C74]">
          <User className="size-10 mx-auto mb-3 text-[#3A3E45]" />
          <h3 className="text-sm font-bold text-[#F3F1EC]">Student Not Found</h3>
          <p className="text-xs text-[#9B9EA6] max-w-md mx-auto mt-1">
            No attendance records or scores match register number &ldquo;{searchRegNo}&rdquo;. Please verify the register number and try again.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Student Identity Card */}
          <div className="bg-[#111318] rounded-xl border border-[#292D33] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#FF2A1A]/10 text-[#FF2A1A] border border-[#FF2A1A]/20">
                  {profile.studentRegNo}
                </span>
                <span className="text-xs text-[#9B9EA6] font-mono tracking-wider">
                  {profile.department} &bull; Year {profile.year} ({profile.section})
                </span>
              </div>
              <h2 className="text-2xl font-display font-extrabold text-[#F3F1EC]">
                {profile.studentName}
              </h2>
              <p className="text-xs text-[#686C74] mt-1 font-mono">
                Department of {profile.department} &bull; Coimbatore Institute of Engineering and Technology
              </p>
            </div>

            {/* OD Eligibility Status Pill */}
            <div className="shrink-0">
              {profile.isOdEligible ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#32C979]/10 border border-[#32C979]/20 text-[#32C979]">
                  <CheckCircle2 className="size-5 text-[#32C979]" />
                  <div>
                    <div className="text-[11px] font-mono font-bold uppercase tracking-wider">OD Eligible</div>
                    <div className="text-[10px] text-[#32C979]/80">Rate &ge; 75% threshold</div>
                  </div>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF2A1A]/10 border border-[#FF2A1A]/20 text-[#FF2A1A]">
                  <XCircle className="size-5 text-[#FF2A1A]" />
                  <div>
                    <div className="text-[11px] font-mono font-bold uppercase tracking-wider">Not Eligible for OD</div>
                    <div className="text-[10px] text-[#FF2A1A]/80">Rate &lt; 75% threshold</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics KPI Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#111318] p-5 rounded-2xl border border-[#292D33] flex items-center gap-4">
              <div className="size-12 rounded-xl bg-[#0D0F12] border border-[#292D33] text-[#F3F1EC] flex items-center justify-center shrink-0">
                <Calendar className="size-6" />
              </div>
              <div>
                <div className="text-[11px] font-mono font-semibold text-[#9B9EA6] uppercase tracking-wider">
                  Attended Sessions
                </div>
                <div className="text-2xl font-extrabold text-[#F3F1EC] font-mono mt-1">
                  {profile.attendedSessions} <span className="text-sm font-normal text-[#686C74]">/ {profile.totalSessions}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#111318] p-5 rounded-2xl border border-[#292D33] flex items-center gap-4">
              <div className="size-12 rounded-xl bg-[#0D0F12] border border-[#292D33] text-[#F3F1EC] flex items-center justify-center shrink-0">
                <Clock className="size-6" />
              </div>
              <div>
                <div className="text-[11px] font-mono font-semibold text-[#9B9EA6] uppercase tracking-wider">
                  Attendance Rate
                </div>
                <div className="text-2xl font-extrabold text-[#F3F1EC] font-mono mt-1">
                  {profile.attendanceRate}%
                </div>
              </div>
            </div>

            <div className="bg-[#111318] p-5 rounded-2xl border border-[#292D33] flex items-center gap-4">
              <div className="size-12 rounded-xl bg-[#0D0F12] border border-[#292D33] text-[#F3F1EC] flex items-center justify-center shrink-0">
                <Trophy className="size-6" />
              </div>
              <div>
                <div className="text-[11px] font-mono font-semibold text-[#9B9EA6] uppercase tracking-wider">
                  Events Evaluated
                </div>
                <div className="text-2xl font-extrabold text-[#F3F1EC] font-mono mt-1">
                  {profile.totalEventsScored}
                </div>
              </div>
            </div>

            <div className="bg-[#111318] p-5 rounded-2xl border border-[#292D33] flex items-center gap-4">
              <div className="size-12 rounded-xl bg-[#0D0F12] border border-[#292D33] text-[#F2B84B] flex items-center justify-center shrink-0">
                <Trophy className="size-6" />
              </div>
              <div>
                <div className="text-[11px] font-mono font-semibold text-[#9B9EA6] uppercase tracking-wider">
                  Average Score
                </div>
                <div className="text-2xl font-extrabold text-[#F2B84B] font-mono mt-1">
                  {profile.totalEventsScored > 0 ? `${profile.overallAveragePercentage}%` : "N/A"}
                </div>
              </div>
            </div>
          </div>

          {/* Top Score Callout (if available) */}
          {profile.topScore && (
            <div className="bg-gradient-to-r from-[#F2B84B]/10 via-[#F2B84B]/5 to-transparent border border-[#F2B84B]/30 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-[#F2B84B] text-[#0D0F12] flex items-center justify-center shrink-0">
                  <Trophy className="size-5" />
                </div>
                <div>
                  <div className="text-[11px] font-mono font-bold text-[#F2B84B] uppercase tracking-wider">
                    Highest Performance Highlight
                  </div>
                  <div className="text-sm font-extrabold text-[#F3F1EC]">
                    {profile.topScore.eventName}
                    {profile.topScore.subEventName && ` — ${profile.topScore.subEventName}`}
                  </div>
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-lg font-black text-[#F2B84B]">
                  {profile.topScore.score} / {profile.topScore.maxScore}
                </div>
                <div className="text-xs font-bold text-[#F2B84B]/80">
                  {profile.topScore.percentage}%
                </div>
              </div>
            </div>
          )}

          {/* Table 1: Attendance Session History */}
          <div className="bg-[#111318] rounded-xl border border-[#292D33] overflow-hidden">
            <div className="px-6 py-4 bg-[#0D0F12] border-b border-[#292D33] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#F3F1EC]">Session Attendance History</h3>
                <p className="text-[11px] text-[#9B9EA6] font-mono mt-1">Verified session logs across events</p>
              </div>
              <span className="text-[11px] font-mono font-semibold text-[#9B9EA6] bg-[#1D2026] px-3 py-1 rounded-full border border-[#3A3E45]">
                {profile.attendanceHistory.length} Sessions
              </span>
            </div>

            {profile.attendanceHistory.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#686C74]">
                No attendance sessions recorded for this student.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0D0F12] text-[#9B9EA6] border-b border-[#292D33] font-mono text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4 w-12 text-center">S.No</th>
                      <th className="py-2.5 px-4">Event Name</th>
                      <th className="py-2.5 px-4">Session Name</th>
                      <th className="py-2.5 px-4 text-center">Period</th>
                      <th className="py-2.5 px-4 text-center">Marked At</th>
                      <th className="py-2.5 px-4 text-center">Method</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#292D33] text-[#F3F1EC]">
                    {profile.attendanceHistory.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#1D2026]">
                        <td className="py-2.5 px-4 text-center font-mono text-[#686C74]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-[#F3F1EC]">
                          {item.eventName}
                        </td>
                        <td className="py-2.5 px-4 text-[#9B9EA6]">
                          {item.sessionName}
                        </td>
                        <td className="py-2.5 px-4 text-center capitalize font-mono text-[11px]">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full border ${
                              item.period === "morning"
                                ? "bg-[#F2B84B]/10 text-[#F2B84B] border-[#F2B84B]/20"
                                : "bg-[#7FA7FF]/10 text-[#7FA7FF] border-[#7FA7FF]/20"
                            }`}
                          >
                            {item.period}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono text-[11px] text-[#9B9EA6]">
                          {new Date(item.markedAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center gap-1.5 text-[11px] text-[#9B9EA6] bg-[#0D0F12] border border-[#292D33] px-2 py-1 rounded-md">
                            {item.verificationMethod === "qr_scan" ? (
                              <>
                                <QrCode className="size-3 text-[#FF2A1A]" />
                                <span>QR Scan</span>
                              </>
                            ) : (
                              <span>Manual Entry</span>
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="font-semibold text-[#32C979] text-[10px] uppercase tracking-wider bg-[#32C979]/10 px-2 py-0.5 rounded border border-[#32C979]/20">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Table 2: Competition Scores (if any) */}
          {profile.scoreRecords.length > 0 && (
            <div className="bg-[#111318] rounded-xl border border-[#292D33] overflow-hidden">
              <div className="px-6 py-4 bg-[#0D0F12] border-b border-[#292D33] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#F3F1EC]">Competition & Evaluation Marks</h3>
                  <p className="text-[11px] text-[#9B9EA6] font-mono mt-1">Official scores recorded for competitions</p>
                </div>
                <span className="text-[11px] font-mono font-semibold text-[#9B9EA6] bg-[#1D2026] px-3 py-1 rounded-full border border-[#3A3E45]">
                  {profile.scoreRecords.length} Competitions
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0D0F12] text-[#9B9EA6] border-b border-[#292D33] font-mono text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4 w-12 text-center">S.No</th>
                      <th className="py-2.5 px-4">Event Title</th>
                      <th className="py-2.5 px-4">Track / Sub-Event</th>
                      <th className="py-2.5 px-4 text-center">Score</th>
                      <th className="py-2.5 px-4 text-center">Percentage</th>
                      <th className="py-2.5 px-4 text-center">Entered By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#292D33] text-[#F3F1EC]">
                    {profile.scoreRecords.map((score, idx) => {
                      const pct =
                        score.maxScore > 0
                          ? Math.round((score.score / score.maxScore) * 100 * 10) / 10
                          : 0;

                      return (
                        <tr key={score.id} className="hover:bg-[#1D2026]">
                          <td className="py-2.5 px-4 text-center font-mono text-[#686C74]">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-[#F3F1EC]">
                            {score.eventName}
                          </td>
                          <td className="py-2.5 px-4 text-[#9B9EA6]">
                            {score.subEventName || "Main Competition"}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold text-[#F3F1EC]">
                            {score.score} / {score.maxScore}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold text-[#7FA7FF]">
                            {pct}%
                          </td>
                          <td className="py-2.5 px-4 text-center text-[#9B9EA6] font-mono text-[11px]">
                            {score.enteredByName}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Printable Sheet Modal */}
      {profile && (
        <ReportPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          title="Student Performance & Attendance Profile"
          subtitle={`Verified College Participation Dossier — ${profile.studentName} (${profile.studentRegNo})`}
          onExportCSV={handleExportCSV}
        >
          <div className="space-y-6">
            {/* Student Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs font-sans bg-[#08090B] p-4 rounded-xl border border-[#292D33] print:bg-[#111318] print:border-[#3A3E45]">
              <div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-[#9B9EA6] w-32">Student Name:</span>
                  <span className="font-semibold text-[#F3F1EC]">{profile.studentName}</span>
                </div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-[#9B9EA6] w-32">Register Number:</span>
                  <span className="font-mono font-semibold text-[#F3F1EC]">{profile.studentRegNo}</span>
                </div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-[#9B9EA6] w-32">Department:</span>
                  <span className="text-[#F3F1EC]">{profile.department}</span>
                </div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-[#9B9EA6] w-32">Year & Section:</span>
                  <span className="text-[#F3F1EC]">Year {profile.year} - Section {profile.section}</span>
                </div>
              </div>
              <div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-[#9B9EA6] w-36">Sessions Attended:</span>
                  <span className="font-mono font-semibold text-[#F3F1EC]">
                    {profile.attendedSessions} of {profile.totalSessions} Sessions
                  </span>
                </div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-[#9B9EA6] w-36">Attendance Rate:</span>
                  <span className="font-mono font-bold text-[#7FA7FF]">{profile.attendanceRate}%</span>
                </div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-[#9B9EA6] w-36">OD Eligibility Status:</span>
                  <span
                    className={`font-bold font-sans ${
                      profile.isOdEligible ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {profile.isOdEligible ? "ELIGIBLE (>= 75%)" : "NOT ELIGIBLE (< 75%)"}
                  </span>
                </div>
                {profile.totalEventsScored > 0 && (
                  <div className="flex gap-2 py-0.5">
                    <span className="font-bold text-[#9B9EA6] w-36">Competition Average:</span>
                    <span className="font-mono font-bold text-amber-700">
                      {profile.overallAveragePercentage}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Attendance Logs Table */}
            <div>
              <h4 className="font-bold uppercase text-[11px] text-[#9B9EA6] mb-2 font-sans">
                Session Attendance Records
              </h4>
              <table className="w-full text-left text-xs border border-[#3A3E45] font-sans">
                <thead>
                  <tr className="bg-[#171A20] border-b border-[#3A3E45] font-bold uppercase text-[10px] text-[#9B9EA6]">
                    <th className="py-2 px-2.5 border-r border-[#3A3E45] w-10 text-center">S.No</th>
                    <th className="py-2 px-3 border-r border-[#3A3E45]">Event Title</th>
                    <th className="py-2 px-3 border-r border-[#3A3E45]">Session</th>
                    <th className="py-2 px-3 border-r border-[#3A3E45] text-center w-24">Period</th>
                    <th className="py-2 px-3 border-r border-[#3A3E45] text-center w-36">Timestamp</th>
                    <th className="py-2 px-3 text-center w-24">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {profile.attendanceHistory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#08090B]">
                      <td className="py-1.5 px-2.5 border-r border-[#292D33] text-center font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-1.5 px-3 border-r border-[#292D33] font-semibold text-[#F3F1EC]">
                        {item.eventName}
                      </td>
                      <td className="py-1.5 px-3 border-r border-[#292D33] text-[#9B9EA6]">
                        {item.sessionName}
                      </td>
                      <td className="py-1.5 px-3 border-r border-[#292D33] text-center capitalize font-mono">
                        {item.period}
                      </td>
                      <td className="py-1.5 px-3 border-r border-[#292D33] text-center font-mono text-[11px] text-[#9B9EA6]">
                        {new Date(item.markedAt).toLocaleDateString()}
                      </td>
                      <td className="py-1.5 px-3 text-center font-bold text-emerald-800">
                        PRESENT
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Competition Scores if any */}
            {profile.scoreRecords.length > 0 && (
              <div>
                <h4 className="font-bold uppercase text-[11px] text-[#9B9EA6] mb-2 font-sans">
                  Competition & Evaluation Marks
                </h4>
                <table className="w-full text-left text-xs border border-[#3A3E45] font-sans">
                  <thead>
                    <tr className="bg-[#171A20] border-b border-[#3A3E45] font-bold uppercase text-[10px] text-[#9B9EA6]">
                      <th className="py-2 px-2.5 border-r border-[#3A3E45] w-10 text-center">S.No</th>
                      <th className="py-2 px-3 border-r border-[#3A3E45]">Competition</th>
                      <th className="py-2 px-3 border-r border-[#3A3E45]">Track</th>
                      <th className="py-2 px-3 border-r border-[#3A3E45] text-center w-28">Score</th>
                      <th className="py-2 px-3 text-center w-28">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {profile.scoreRecords.map((score, idx) => (
                      <tr key={score.id} className="hover:bg-[#08090B]">
                        <td className="py-1.5 px-2.5 border-r border-[#292D33] text-center font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-3 border-r border-[#292D33] font-semibold text-[#F3F1EC]">
                          {score.eventName}
                        </td>
                        <td className="py-1.5 px-3 border-r border-[#292D33] text-[#9B9EA6]">
                          {score.subEventName || "General"}
                        </td>
                        <td className="py-1.5 px-3 border-r border-[#292D33] text-center font-mono font-bold">
                          {score.score} / {score.maxScore}
                        </td>
                        <td className="py-1.5 px-3 text-center font-mono font-bold text-[#7FA7FF]">
                          {Math.round((score.score / score.maxScore) * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </ReportPrintModal>
      )}
    </div>
  );
}
