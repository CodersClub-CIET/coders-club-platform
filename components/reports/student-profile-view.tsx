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
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="size-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Enter Student Register Number (e.g., 917621104001 or 7100...)"
              value={searchRegNo}
              onChange={(e) => setSearchRegNo(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2 shadow-sm"
            >
              <Search className="size-3.5" />
              <span>Lookup Profile</span>
            </Button>

            {profile && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="text-xs font-semibold gap-1.5 border-slate-300 text-slate-700"
                >
                  <Download className="size-3.5" />
                  <span className="hidden sm:inline">Export</span> CSV
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                >
                  <Printer className="size-3.5" />
                  <span className="hidden sm:inline">Print</span> Sheet
                </Button>
              </>
            )}
          </div>
        </form>
      </div>

      {/* Main Profile View / States */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 py-20 flex flex-col items-center justify-center">
          <Loading label="Retrieving student attendance history & competition scores..." />
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center space-y-3">
          <div className="size-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="size-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Search Error</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
        </div>
      ) : !hasSearched ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 py-16 text-center text-slate-400">
          <GraduationCap className="size-10 mx-auto mb-3 text-slate-300" />
          <h3 className="text-sm font-bold text-slate-700">Student Comprehensive Record Lookup</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Search any student by register number to view their verified session attendances, On-Duty eligibility status, and event competition marks.
          </p>
        </div>
      ) : !profile ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 py-16 text-center text-slate-400">
          <User className="size-10 mx-auto mb-3 text-slate-300" />
          <h3 className="text-sm font-bold text-slate-700">Student Not Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            No attendance records or scores match register number &ldquo;{searchRegNo}&rdquo;. Please verify the register number and try again.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Student Identity Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {profile.studentRegNo}
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  {profile.department} &bull; Year {profile.year} ({profile.section})
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                {profile.studentName}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Department of {profile.department} &bull; Coimbatore Institute of Engineering and Technology
              </p>
            </div>

            {/* OD Eligibility Status Pill */}
            <div className="shrink-0">
              {profile.isOdEligible ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider">OD Eligible</div>
                    <div className="text-[10px] text-emerald-600">Rate &ge; 75% threshold</div>
                  </div>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                  <XCircle className="size-5 text-rose-600" />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider">Not Eligible for OD</div>
                    <div className="text-[10px] text-rose-600">Rate &lt; 75% threshold</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics KPI Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Calendar className="size-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Attended Sessions
                </div>
                <div className="text-2xl font-extrabold text-slate-900 font-mono">
                  {profile.attendedSessions} <span className="text-sm font-normal text-slate-400">/ {profile.totalSessions}</span>
                </div>
                <div className="text-[11px] text-slate-400">Total sessions tracked</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-12 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Clock className="size-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Attendance Rate
                </div>
                <div className="text-2xl font-extrabold text-slate-900 font-mono">
                  {profile.attendanceRate}%
                </div>
                <div className="text-[11px] text-slate-400">Overall participation</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Trophy className="size-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Events Evaluated
                </div>
                <div className="text-2xl font-extrabold text-slate-900 font-mono">
                  {profile.totalEventsScored}
                </div>
                <div className="text-[11px] text-slate-400">Scored competitions</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Trophy className="size-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Average Score
                </div>
                <div className="text-2xl font-extrabold text-emerald-700 font-mono">
                  {profile.totalEventsScored > 0 ? `${profile.overallAveragePercentage}%` : "N/A"}
                </div>
                <div className="text-[11px] text-emerald-600 font-medium">Competition average</div>
              </div>
            </div>
          </div>

          {/* Top Score Callout (if available) */}
          {profile.topScore && (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <Trophy className="size-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Highest Performance Highlight
                  </div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {profile.topScore.eventName}
                    {profile.topScore.subEventName && ` — ${profile.topScore.subEventName}`}
                  </div>
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-lg font-black text-amber-700">
                  {profile.topScore.score} / {profile.topScore.maxScore}
                </div>
                <div className="text-xs font-bold text-amber-600">
                  {profile.topScore.percentage}%
                </div>
              </div>
            </div>
          )}

          {/* Table 1: Attendance Session History */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Session Attendance History</h3>
                <p className="text-[11px] text-slate-500">Verified session logs across events</p>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-500">
                {profile.attendanceHistory.length} Sessions
              </span>
            </div>

            {profile.attendanceHistory.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                No attendance sessions recorded for this student.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider">
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
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {profile.attendanceHistory.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-4 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {item.eventName}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          {item.sessionName}
                        </td>
                        <td className="py-2.5 px-4 text-center capitalize">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                              item.period === "morning"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {item.period}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono text-[11px] text-slate-500">
                          {new Date(item.markedAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                            {item.verificationMethod === "qr_scan" ? (
                              <>
                                <QrCode className="size-3 text-indigo-600" />
                                <span>QR Scan</span>
                              </>
                            ) : (
                              <span>Manual Entry</span>
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="font-semibold text-emerald-700 text-[10px] uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Competition & Evaluation Marks</h3>
                  <p className="text-[11px] text-slate-500">Official scores recorded for competitions</p>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-500">
                  {profile.scoreRecords.length} Competitions
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4 w-12 text-center">S.No</th>
                      <th className="py-2.5 px-4">Event Title</th>
                      <th className="py-2.5 px-4">Track / Sub-Event</th>
                      <th className="py-2.5 px-4 text-center">Score</th>
                      <th className="py-2.5 px-4 text-center">Percentage</th>
                      <th className="py-2.5 px-4 text-center">Entered By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {profile.scoreRecords.map((score, idx) => {
                      const pct =
                        score.maxScore > 0
                          ? Math.round((score.score / score.maxScore) * 100 * 10) / 10
                          : 0;

                      return (
                        <tr key={score.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-4 text-center font-mono text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900">
                            {score.eventName}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">
                            {score.subEventName || "Main Competition"}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900">
                            {score.score} / {score.maxScore}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold text-indigo-700">
                            {pct}%
                          </td>
                          <td className="py-2.5 px-4 text-center text-slate-500">
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
            <div className="grid grid-cols-2 gap-4 text-xs font-sans bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-white print:border-slate-300">
              <div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-slate-700 w-32">Student Name:</span>
                  <span className="font-semibold text-slate-900">{profile.studentName}</span>
                </div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-slate-700 w-32">Register Number:</span>
                  <span className="font-mono font-semibold text-slate-900">{profile.studentRegNo}</span>
                </div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-slate-700 w-32">Department:</span>
                  <span className="text-slate-900">{profile.department}</span>
                </div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-slate-700 w-32">Year & Section:</span>
                  <span className="text-slate-900">Year {profile.year} - Section {profile.section}</span>
                </div>
              </div>
              <div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-slate-700 w-36">Sessions Attended:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {profile.attendedSessions} of {profile.totalSessions} Sessions
                  </span>
                </div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-slate-700 w-36">Attendance Rate:</span>
                  <span className="font-mono font-bold text-indigo-700">{profile.attendanceRate}%</span>
                </div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-slate-700 w-36">OD Eligibility Status:</span>
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
                    <span className="font-bold text-slate-700 w-36">Competition Average:</span>
                    <span className="font-mono font-bold text-amber-700">
                      {profile.overallAveragePercentage}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Attendance Logs Table */}
            <div>
              <h4 className="font-bold uppercase text-[11px] text-slate-700 mb-2 font-sans">
                Session Attendance Records
              </h4>
              <table className="w-full text-left text-xs border border-slate-300 font-sans">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px] text-slate-700">
                    <th className="py-2 px-2.5 border-r border-slate-300 w-10 text-center">S.No</th>
                    <th className="py-2 px-3 border-r border-slate-300">Event Title</th>
                    <th className="py-2 px-3 border-r border-slate-300">Session</th>
                    <th className="py-2 px-3 border-r border-slate-300 text-center w-24">Period</th>
                    <th className="py-2 px-3 border-r border-slate-300 text-center w-36">Timestamp</th>
                    <th className="py-2 px-3 text-center w-24">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {profile.attendanceHistory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-center font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-200 font-semibold text-slate-900">
                        {item.eventName}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">
                        {item.sessionName}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-200 text-center capitalize font-mono">
                        {item.period}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-200 text-center font-mono text-[11px] text-slate-600">
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
                <h4 className="font-bold uppercase text-[11px] text-slate-700 mb-2 font-sans">
                  Competition & Evaluation Marks
                </h4>
                <table className="w-full text-left text-xs border border-slate-300 font-sans">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px] text-slate-700">
                      <th className="py-2 px-2.5 border-r border-slate-300 w-10 text-center">S.No</th>
                      <th className="py-2 px-3 border-r border-slate-300">Competition</th>
                      <th className="py-2 px-3 border-r border-slate-300">Track</th>
                      <th className="py-2 px-3 border-r border-slate-300 text-center w-28">Score</th>
                      <th className="py-2 px-3 text-center w-28">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {profile.scoreRecords.map((score, idx) => (
                      <tr key={score.id} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2.5 border-r border-slate-200 text-center font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-200 font-semibold text-slate-900">
                          {score.eventName}
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-200 text-slate-700">
                          {score.subEventName || "General"}
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-200 text-center font-mono font-bold">
                          {score.score} / {score.maxScore}
                        </td>
                        <td className="py-1.5 px-3 text-center font-mono font-bold text-indigo-700">
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
