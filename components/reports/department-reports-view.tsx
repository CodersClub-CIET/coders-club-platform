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
        <div className="bg-[#111318] border border-[#292D33] rounded-xl p-5 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-[#0D0F12] border border-[#292D33] text-[#F3F1EC] flex items-center justify-center shrink-0">
            <Users className="size-6" />
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#9B9EA6] mb-1">
              Total Students
            </div>
            <div className="text-2xl font-extrabold text-[#F3F1EC] font-mono">
              {totalStudentsOverall}
            </div>
          </div>
        </div>

        <div className="bg-[#111318] border border-[#292D33] rounded-xl p-5 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-[#0D0F12] border border-[#292D33] text-[#F3F1EC] flex items-center justify-center shrink-0">
            <Calendar className="size-6" />
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#9B9EA6] mb-1">
              Attendance Records
            </div>
            <div className="text-2xl font-extrabold text-[#F3F1EC] font-mono">
              {totalAttendancesOverall}
            </div>
          </div>
        </div>

        <div className="bg-[#111318] border border-[#292D33] rounded-xl p-5 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-[#0D0F12] border border-[#292D33] text-[#F3F1EC] flex items-center justify-center shrink-0">
            <BarChart3 className="size-6" />
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#9B9EA6] mb-1">
              Average Attendance
            </div>
            <div className="text-2xl font-extrabold text-[#F3F1EC] font-mono">
              {overallAverageAttendance}%
            </div>
          </div>
        </div>

        <div className="bg-[#111318] border border-[#292D33] rounded-xl p-5 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-[#0D0F12] border border-[#292D33] text-[#32C979] flex items-center justify-center shrink-0">
            <CheckCircle2 className="size-6" />
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#9B9EA6] mb-1">
              OD Eligible (≥75%)
            </div>
            <div className="text-2xl font-extrabold text-[#32C979] font-mono">
              {totalOdEligibleOverall}
            </div>
          </div>
        </div>
      </div>

      {/* Action Toolbar & Filters */}
      <div className="bg-[#111318] rounded-xl border border-[#292D33] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="size-4 text-[#9B9EA6] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#0D0F12] border border-[#292D33] rounded-lg text-xs text-[#F3F1EC] placeholder:text-[#686C74] focus:outline-none focus:border-[#FF2A1A]/50"
            />
          </div>

          {/* Period Filter */}
          <div className="flex items-center gap-1.5 text-xs text-[#9B9EA6]">
            <span className="font-mono text-[11px] uppercase tracking-wider">Period:</span>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as AttendancePeriod | "all")}
              className="px-2.5 py-1.5 bg-[#0D0F12] border border-[#292D33] rounded-lg text-xs text-[#F3F1EC] focus:outline-none focus:border-[#FF2A1A]/50"
            >
              <option value="all">All Periods</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-[#9B9EA6]">
            <span className="font-mono text-[11px] uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AttendanceStatus | "all")}
              className="px-2.5 py-1.5 bg-[#0D0F12] border border-[#292D33] rounded-lg text-xs text-[#F3F1EC] focus:outline-none focus:border-[#FF2A1A]/50"
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
            className="text-xs text-[#9B9EA6] hover:text-[#F3F1EC] hover:bg-[#0D0F12]"
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
            className="bg-[#FF2A1A] hover:bg-[#C51D16] text-white font-mono text-[11px] uppercase tracking-wider px-4 py-2 rounded-lg border-0"
          >
            <Download className="size-3.5 mr-1.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsPrintModalOpen(true)}
            disabled={loading || filteredSummaries.length === 0}
            className="bg-[#0D0F12] hover:bg-[#1D2026] text-[#F3F1EC] font-mono text-[11px] uppercase tracking-wider px-4 py-2 rounded-lg border border-[#292D33]"
          >
            <Printer className="size-3.5 mr-1.5" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* Main Table or Loading/Error State */}
      <div className="bg-[#111318] rounded-xl border border-[#292D33] overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loading label="Aggregating departmental attendance and performance metrics..." />
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <div className="size-12 rounded-full bg-[#FF2A1A]/10 text-[#FF2A1A] flex items-center justify-center mx-auto border border-[#FF2A1A]/20">
              <AlertCircle className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-[#F3F1EC]">Failed to Load Department Report</h3>
            <p className="text-xs text-[#9B9EA6] max-w-md mx-auto">{error}</p>
            <Button
              type="button"
              size="sm"
              onClick={handleRefresh}
              className="text-xs bg-[#FF2A1A] hover:bg-[#C51D16] text-white"
            >
              Retry
            </Button>
          </div>
        ) : filteredSummaries.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#9B9EA6]">
            <Building2 className="size-8 mx-auto mb-2 text-[#3A3E45]" />
            <p className="font-semibold text-[#F3F1EC]">No department records matched the criteria.</p>
            <p className="text-[11px] mt-0.5">Try selecting a different filter or search term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0D0F12] text-[#9B9EA6] border-b border-[#292D33] font-mono text-[11px] uppercase tracking-wider">
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
              <tbody className="divide-y divide-[#292D33] text-[#F3F1EC]">
                {filteredSummaries.map((summary, idx) => {
                  const rate = summary.averageAttendanceRate;
                  const rateColor =
                    rate >= 75
                      ? "bg-[#32C979]/10 text-[#32C979] border-[#32C979]/20"
                      : rate >= 50
                      ? "bg-[#7FA7FF]/10 text-[#7FA7FF] border-[#7FA7FF]/20"
                      : "bg-[#F2B84B]/10 text-[#F2B84B] border-[#F2B84B]/20";

                  return (
                    <tr key={summary.department} className="hover:bg-[#1D2026] transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-[#686C74]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#F3F1EC]">
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
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border font-mono ${rateColor}`}
                        >
                          {summary.averageAttendanceRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-[#32C979] font-mono">
                        {summary.odEligibleCount}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {summary.totalEventsParticipated}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-[#9B9EA6]">
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
          <div className="grid grid-cols-2 gap-4 text-xs font-sans bg-[#08090B] p-4 rounded-xl border border-[#292D33] print:bg-[#111318] print:border-[#3A3E45]">
            <div>
              <div className="flex gap-2 py-0.5">
                <span className="font-bold text-[#9B9EA6] w-36">Academic Period:</span>
                <span className="capitalize font-semibold text-[#F3F1EC]">
                  {periodFilter === "all" ? "All Periods (Full Day)" : `${periodFilter} Session`}
                </span>
              </div>
              <div className="flex gap-2 py-0.5">
                <span className="font-bold text-[#9B9EA6] w-36">Total Departments:</span>
                <span className="font-semibold text-[#F3F1EC]">{filteredSummaries.length} Departments</span>
              </div>
            </div>
            <div>
              <div className="flex gap-2 py-0.5">
                <span className="font-bold text-[#9B9EA6] w-36">Total Verified:</span>
                <span className="font-bold text-emerald-700">
                  {totalStudentsOverall} Students ({totalOdEligibleOverall} OD Eligible)
                </span>
              </div>
              <div className="flex gap-2 py-0.5">
                <span className="font-bold text-[#9B9EA6] w-36">Overall Avg Rate:</span>
                <span className="font-semibold text-[#7FA7FF]">{overallAverageAttendance}%</span>
              </div>
            </div>
          </div>

          {/* Printable Roster Table */}
          <table className="w-full text-left text-xs border border-[#3A3E45] font-sans">
            <thead>
              <tr className="bg-[#171A20] border-b border-[#3A3E45] font-bold uppercase text-[10px] text-[#9B9EA6]">
                <th className="py-2 px-2.5 border-r border-[#3A3E45] w-10 text-center">S.No</th>
                <th className="py-2 px-3 border-r border-[#3A3E45]">Department</th>
                <th className="py-2 px-3 border-r border-[#3A3E45] text-center w-28">Total Students</th>
                <th className="py-2 px-3 border-r border-[#3A3E45] text-center w-28">Attendance Logs</th>
                <th className="py-2 px-3 border-r border-[#3A3E45] text-center w-28">Avg Attendance</th>
                <th className="py-2 px-3 border-r border-[#3A3E45] text-center w-28">OD Eligible</th>
                <th className="py-2 px-3 text-center w-24">Avg Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSummaries.map((s, idx) => (
                <tr key={s.department} className="hover:bg-[#08090B]">
                  <td className="py-1.5 px-2.5 border-r border-[#292D33] text-center font-mono">
                    {idx + 1}
                  </td>
                  <td className="py-1.5 px-3 border-r border-[#292D33] font-semibold text-[#F3F1EC]">
                    {s.department}
                  </td>
                  <td className="py-1.5 px-3 border-r border-[#292D33] text-center font-mono">
                    {s.totalStudents}
                  </td>
                  <td className="py-1.5 px-3 border-r border-[#292D33] text-center font-mono">
                    {s.totalAttendanceRecords}
                  </td>
                  <td className="py-1.5 px-3 border-r border-[#292D33] text-center font-mono font-bold">
                    {s.averageAttendanceRate}%
                  </td>
                  <td className="py-1.5 px-3 border-r border-[#292D33] text-center font-mono font-bold text-emerald-700">
                    {s.odEligibleCount}
                  </td>
                  <td className="py-1.5 px-3 text-center font-mono text-[#9B9EA6]">
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
