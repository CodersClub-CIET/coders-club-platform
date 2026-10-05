"use client";

import React, { useEffect, useState, useMemo } from "react";
import { reportService } from "@/lib/reports/report-service";
import type { AssociateDutyReportSummary, AllocationStatus } from "@/lib/reports/types";
import { DEPARTMENTS } from "@/lib/attendance/types";
import { generateAssociateDutyCSV, downloadCSV } from "@/lib/reports/export-utils";
import ReportPrintModal from "./report-print-modal";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import {
  Briefcase,
  Users,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  Search,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function AssociateDutyView() {
  const [summaries, setSummaries] = useState<AssociateDutyReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<AllocationStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadDutyData() {
      try {
        setLoading(true);
        setError(null);
        const query = {
          department: deptFilter !== "all" ? deptFilter : undefined,
          allocationStatus: statusFilter !== "all" ? statusFilter : undefined,
        };
        const data = await reportService.getAssociateDutySummaries(query);
        if (isMounted) {
          setSummaries(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to load associate duty reports.";
          setError(msg);
          toast.error(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDutyData();
    return () => {
      isMounted = false;
    };
  }, [deptFilter, statusFilter, reloadKey]);

  const handleRefresh = () => {
    setReloadKey((prev) => prev + 1);
  };

  // Client-side text search
  const filteredSummaries = useMemo(() => {
    if (!searchQuery.trim()) return summaries;
    const q = searchQuery.trim().toLowerCase();
    return summaries.filter(
      (s) =>
        s.associateName.toLowerCase().includes(q) ||
        s.associateId.toLowerCase().includes(q) ||
        s.associateEmail.toLowerCase().includes(q)
    );
  }, [summaries, searchQuery]);

  // Executive KPI stats
  const totalAssociates = filteredSummaries.length;
  const totalActiveAllocations = useMemo(
    () => filteredSummaries.reduce((acc, s) => acc + s.activeAllocations, 0),
    [filteredSummaries]
  );
  const totalCompletedAllocations = useMemo(
    () => filteredSummaries.reduce((acc, s) => acc + s.completedAllocations, 0),
    [filteredSummaries]
  );
  const totalVerifiedCheckIns = useMemo(
    () => filteredSummaries.reduce((acc, s) => acc + s.verifiedAttendances, 0),
    [filteredSummaries]
  );

  const handleExportCSV = () => {
    try {
      if (filteredSummaries.length === 0) {
        toast.warning("No associate records available to export.");
        return;
      }
      const csv = generateAssociateDutyCSV(filteredSummaries);
      downloadCSV(csv, "associate_duty_allocation_report");
      toast.success("Associate duty roster CSV exported successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to export CSV.";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Associates
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">
              {totalAssociates}
            </div>
            <div className="text-[11px] text-slate-400">Assigned coordinators</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <Clock className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Duties
            </div>
            <div className="text-2xl font-extrabold text-purple-700 font-mono">
              {totalActiveAllocations}
            </div>
            <div className="text-[11px] text-purple-600 font-medium">Currently active</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Completed Duties
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 font-mono">
              {totalCompletedAllocations}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">Successfully finished</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Briefcase className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Verified Check-Ins
            </div>
            <div className="text-2xl font-extrabold text-blue-700 font-mono">
              {totalVerifiedCheckIns}
            </div>
            <div className="text-[11px] text-slate-400">On-site attendance logs</div>
          </div>
        </div>
      </div>

      {/* Action Toolbar & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="size-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search associate name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-500">Dept:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
            >
              <option value="all">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AllocationStatus | "all")}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            title="Reload associate duty roster"
            className="text-xs text-slate-600 hover:text-slate-900"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>

        {/* Export & Print */}
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
            <span>Print Roster</span>
          </Button>
        </div>
      </div>

      {/* Main Table or Loading/Error State */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loading label="Correlating associate duty allocations with verified check-ins..." />
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <div className="size-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Failed to Load Associate Roster</h3>
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
            <Briefcase className="size-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">No associate duty records found.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting the department or status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">S.No</th>
                  <th className="py-3 px-4">Associate</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Allocations</th>
                  <th className="py-3 px-4 text-center">Active</th>
                  <th className="py-3 px-4 text-center">Completed</th>
                  <th className="py-3 px-4 text-center">Verified Check-Ins</th>
                  <th className="py-3 px-4">Assigned Events</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredSummaries.map((summary, idx) => (
                  <tr key={summary.associateId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{summary.associateName}</div>
                      <div className="text-[11px] font-mono text-slate-400">{summary.associateEmail}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {summary.department}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                      {summary.totalAllocations}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-purple-700 font-semibold">
                      {summary.activeAllocations}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-emerald-700 font-semibold">
                      {summary.completedAllocations}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-indigo-700">
                      {summary.verifiedAttendances}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600 max-w-xs">
                      {summary.allocatedEvents.length === 0 ? (
                        <span className="text-slate-400 italic">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {summary.allocatedEvents.map((evt, i) => (
                            <span
                              key={i}
                              className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                evt.status === "active"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : evt.status === "completed"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              {evt.eventName}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print Document Modal */}
      <ReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Associate Duty Allocation & Verified Attendance Roster"
        subtitle="Official deployment and check-in audit for Coders Club student associates"
        onExportCSV={handleExportCSV}
      >
        <div className="space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs font-sans bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-white print:border-slate-300">
            <div>
              <div className="flex gap-2 py-0.5">
                <span className="font-bold text-slate-700 w-36">Total Associates:</span>
                <span className="font-semibold text-slate-900">{totalAssociates} Assigned</span>
              </div>
              <div className="flex gap-2 py-0.5">
                <span className="font-bold text-slate-700 w-36">Department Filter:</span>
                <span className="capitalize font-semibold text-slate-900">{deptFilter}</span>
              </div>
            </div>
            <div>
              <div className="flex gap-2 py-0.5">
                <span className="font-bold text-slate-700 w-36">Active / Completed:</span>
                <span className="font-semibold text-slate-900">
                  {totalActiveAllocations} Active, {totalCompletedAllocations} Completed
                </span>
              </div>
              <div className="flex gap-2 py-0.5">
                <span className="font-bold text-slate-700 w-36">Verified Check-Ins:</span>
                <span className="font-mono font-bold text-indigo-700">{totalVerifiedCheckIns} Verified</span>
              </div>
            </div>
          </div>

          {/* Printable Roster Table */}
          <table className="w-full text-left text-xs border border-slate-300 font-sans">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px] text-slate-700">
                <th className="py-2 px-2.5 border-r border-slate-300 w-10 text-center">S.No</th>
                <th className="py-2 px-3 border-r border-slate-300">Associate Name</th>
                <th className="py-2 px-3 border-r border-slate-300 text-center w-20">Dept</th>
                <th className="py-2 px-3 border-r border-slate-300 text-center w-24">Allocations</th>
                <th className="py-2 px-3 border-r border-slate-300 text-center w-24">Active</th>
                <th className="py-2 px-3 border-r border-slate-300 text-center w-24">Completed</th>
                <th className="py-2 px-3 border-r border-slate-300 text-center w-28">Verified Checks</th>
                <th className="py-2 px-3">Assigned Events</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSummaries.map((s, idx) => (
                <tr key={s.associateId} className="hover:bg-slate-50">
                  <td className="py-1.5 px-2.5 border-r border-slate-200 text-center font-mono">
                    {idx + 1}
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 font-semibold text-slate-900">
                    {s.associateName}
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-center font-semibold text-slate-700">
                    {s.department}
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-center font-mono">
                    {s.totalAllocations}
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-center font-mono font-semibold text-purple-700">
                    {s.activeAllocations}
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-center font-mono font-semibold text-emerald-700">
                    {s.completedAllocations}
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-center font-mono font-bold text-indigo-700">
                    {s.verifiedAttendances}
                  </td>
                  <td className="py-1.5 px-3 text-[11px] text-slate-600">
                    {s.allocatedEvents.map((e) => `${e.eventName} (${e.status})`).join("; ") || "None"}
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
