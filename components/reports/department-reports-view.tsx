"use client";

import React, { useEffect, useState, useMemo } from "react";
import { reportService } from "@/lib/reports/report-service";
import type { DepartmentReportSummary, AttendancePeriod, AttendanceStatus } from "@/lib/reports/types";
import { generateDepartmentReportCSV, downloadCSV } from "@/lib/reports/export-utils";
import ReportPrintModal from "./report-print-modal";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import {
  Building2,
  Download,
  Printer,
  Users,
  CheckCircle2,
  BarChart3,
  Calendar,
  AlertCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";

export default function DepartmentReportsView() {
  const [summaries, setSummaries] = useState<DepartmentReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [periodFilter, setPeriodFilter] = useState<AttendancePeriod | "all">("all");
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadDepartmentData() {
      try {
        setLoading(true);
        setError(null);
        const query = {
          period: periodFilter !== "all" ? periodFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        };
        const data = await reportService.getDepartmentReportSummaries(query);
        if (isMounted) {
          setSummaries(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to load departmental reports.";
          setError(msg);
          toast.error(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDepartmentData();
    return () => {
      isMounted = false;
    };
  }, [periodFilter, statusFilter, reloadKey]);

  const handleRefresh = () => {
    setReloadKey((prev) => prev + 1);
  };

  // Client-side search filtering
  const filteredSummaries = useMemo(() => {
    if (!searchQuery.trim()) return summaries;
    const query = searchQuery.trim().toLowerCase();
    return summaries.filter((s) => s.department.toLowerCase().includes(query));
  }, [summaries, searchQuery]);

  // Overall KPI metrics
  const totalStudentsOverall = useMemo(
    () => filteredSummaries.reduce((acc, s) => acc + s.totalStudents, 0),
    [filteredSummaries]
  );

  const totalAttendancesOverall = useMemo(
    () => filteredSummaries.reduce((acc, s) => acc + s.totalAttendanceRecords, 0),
    [filteredSummaries]
  );

  const totalOdEligibleOverall = useMemo(
    () => filteredSummaries.reduce((acc, s) => acc + s.odEligibleCount, 0),
    [filteredSummaries]
  );

  const overallAverageAttendance = useMemo(() => {
    if (filteredSummaries.length === 0) return 0;
    const sum = filteredSummaries.reduce((acc, s) => acc + s.averageAttendanceRate, 0);
    return Math.round((sum / filteredSummaries.length) * 10) / 10;
  }, [filteredSummaries]);

  // CSV Export Handler
  const handleExportCSV = () => {
    try {
      if (filteredSummaries.length === 0) {
        toast.warning("No department data available to export.");
        return;
      }
      const csv = generateDepartmentReportCSV(filteredSummaries);
      downloadCSV(csv, "department_attendance_report");
      toast.success("Department report CSV downloaded successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to export CSV.";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Students
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">
              {totalStudentsOverall}
            </div>
            <div className="text-[11px] text-slate-400">Unique participants</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <Calendar className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Attendance Records
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">
              {totalAttendancesOverall}
            </div>
            <div className="text-[11px] text-slate-400">Total check-in logs</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <BarChart3 className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Average Attendance
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">
              {overallAverageAttendance}%
            </div>
            <div className="text-[11px] text-slate-400">Department mean rate</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              OD Eligible (≥75%)
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 font-mono">
              {totalOdEligibleOverall}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">Qualified for OD</div>
          </div>
        </div>
      </div>

      {/* Action Toolbar & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="size-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>

          {/* Period Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-500">Period:</span>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as AttendancePeriod | "all")}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
            >
              <option value="all">All Periods</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AttendanceStatus | "all")}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="present">Present Only</option>
              <option value="late">Late Only</option>
            </select>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            title="Reload reports"
            className="text-xs text-slate-600 hover:text-slate-900"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>

        {/* Export & Print Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={loading || filteredSummaries.length === 0}
            className="text-xs font-semibold gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsPrintModalOpen(true)}
            disabled={loading || filteredSummaries.length === 0}
            className="text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20"
          >
            <Printer className="size-3.5" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* Main Table or Loading/Error State */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loading label="Aggregating departmental attendance and performance metrics..." />
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <div className="size-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Failed to Load Department Report</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
            <Button
              type="button"
              size="sm"
              onClick={handleRefresh}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Retry
            </Button>
          </div>
        ) : filteredSummaries.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <Building2 className="size-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">No department records matched the criteria.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Try selecting a different filter or search term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">S.No</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Registered Students</th>
                  <th className="py-3 px-4 text-center">Attendance Logs</th>
                  <th className="py-3 px-4 text-center">Avg Attendance %</th>
                  <th className="py-3 px-4 text-center">OD Eligible (≥75%)</th>
                  <th className="py-3 px-4 text-center">Events Participated</th>
                  <th className="py-3 px-4 text-center">Avg Score %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredSummaries.map((summary, idx) => {
                  const rate = summary.averageAttendanceRate;
                  const rateColor =
                    rate >= 75
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : rate >= 50
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-amber-50 text-amber-700 border-amber-200";

                  return (
                    <tr key={summary.department} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {summary.department}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {summary.totalStudents}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {summary.totalAttendanceRecords}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${rateColor}`}
                        >
                          {summary.averageAttendanceRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-emerald-700 font-mono">
                        {summary.odEligibleCount}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {summary.totalEventsParticipated}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">
                        {summary.averageScorePercentage !== undefined
                          ? `${summary.averageScorePercentage}%`
                          : "N/A"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print Document Modal */}
      <ReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Departmental Attendance & Performance Summary Sheet"
        subtitle="Consolidated participation analysis across all engineering departments"
        onExportCSV={handleExportCSV}
      >
        <div className="space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs font-sans bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-white print:border-slate-300">
            <div>
              <div className="flex gap-2 py-0.5">
                <span className="font-bold text-slate-700 w-36">Academic Period:</span>
                <span className="capitalize font-semibold text-slate-900">
                  {periodFilter === "all" ? "All Periods (Full Day)" : `${periodFilter} Session`}
                </span>
              </div>
              <div className="flex gap-2 py-0.5">
                <span className="font-bold text-slate-700 w-36">Total Departments:</span>
                <span className="font-semibold text-slate-900">{filteredSummaries.length} Departments</span>
              </div>
            </div>
            <div>
              <div className="flex gap-2 py-0.5">
                <span className="font-bold text-slate-700 w-36">Total Verified:</span>
                <span className="font-bold text-emerald-700">
                  {totalStudentsOverall} Students ({totalOdEligibleOverall} OD Eligible)
                </span>
              </div>
              <div className="flex gap-2 py-0.5">
                <span className="font-bold text-slate-700 w-36">Overall Avg Rate:</span>
                <span className="font-semibold text-indigo-700">{overallAverageAttendance}%</span>
              </div>
            </div>
          </div>

          {/* Printable Roster Table */}
          <table className="w-full text-left text-xs border border-slate-300 font-sans">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px] text-slate-700">
                <th className="py-2 px-2.5 border-r border-slate-300 w-10 text-center">S.No</th>
                <th className="py-2 px-3 border-r border-slate-300">Department</th>
                <th className="py-2 px-3 border-r border-slate-300 text-center w-28">Total Students</th>
                <th className="py-2 px-3 border-r border-slate-300 text-center w-28">Attendance Logs</th>
                <th className="py-2 px-3 border-r border-slate-300 text-center w-28">Avg Attendance</th>
                <th className="py-2 px-3 border-r border-slate-300 text-center w-28">OD Eligible</th>
                <th className="py-2 px-3 text-center w-24">Avg Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSummaries.map((s, idx) => (
                <tr key={s.department} className="hover:bg-slate-50">
                  <td className="py-1.5 px-2.5 border-r border-slate-200 text-center font-mono">
                    {idx + 1}
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 font-semibold text-slate-900">
                    {s.department}
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-center font-mono">
                    {s.totalStudents}
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-center font-mono">
                    {s.totalAttendanceRecords}
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-center font-mono font-bold">
                    {s.averageAttendanceRate}%
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-center font-mono font-bold text-emerald-700">
                    {s.odEligibleCount}
                  </td>
                  <td className="py-1.5 px-3 text-center font-mono text-slate-600">
                    {s.averageScorePercentage !== undefined ? `${s.averageScorePercentage}%` : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportPrintModal>
    </div>
  );
}
