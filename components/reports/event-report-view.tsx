"use client";

import React, { useEffect, useState, useMemo } from "react";
import { reportService } from "@/lib/reports/report-service";
import { attendanceService } from "@/lib/attendance/attendance-service";
import type { EventReportSummary, AttendanceSession } from "@/lib/reports/types";
import { generateEventReportCSV, downloadCSV } from "@/lib/reports/export-utils";
import ReportPrintModal from "./report-print-modal";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import {
  Calendar,
  Users,
  Trophy,
  Download,
  Printer,
  Building2,
  GraduationCap,
  Sparkles,
  AlertCircle,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

export default function EventReportView() {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [eventSummary, setEventSummary] = useState<EventReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Load available sessions to populate the event selector
  useEffect(() => {
    let isMounted = true;
    async function loadSessions() {
      try {
        setLoadingSessions(true);
        const data = await attendanceService.getSessions();
        if (isMounted) {
          setSessions(data);
          if (data.length > 0) {
            // Default to the first session's event if none selected
            setSelectedEventId((prev) => (prev ? prev : data[0].eventId));
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load events.");
        }
      } finally {
        if (isMounted) setLoadingSessions(false);
      }
    }

    loadSessions();
    return () => {
      isMounted = false;
    };
  }, []);

  // Distinct events list for the selector
  const distinctEvents = useMemo(() => {
    const map = new Map<string, string>();
    sessions.forEach((s) => {
      if (!map.has(s.eventId)) {
        map.set(s.eventId, s.eventName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sessions]);

  // Fetch event summary when selectedEventId changes
  useEffect(() => {
    if (!selectedEventId) return;

    let isMounted = true;
    async function loadSummary() {
      try {
        setLoading(true);
        setError(null);
        const summary = await reportService.getEventReportSummary(selectedEventId);
        if (isMounted) {
          setEventSummary(summary);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to load event report.";
          setError(msg);
          toast.error(msg);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSummary();
    return () => {
      isMounted = false;
    };
  }, [selectedEventId]);

  const handleExportCSV = () => {
    try {
      if (!eventSummary) return;
      const csv = generateEventReportCSV(eventSummary);
      downloadCSV(csv, `event_report_${eventSummary.eventId}`);
      toast.success("Event report CSV exported successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to export CSV.";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Event Selection Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <span className="font-bold text-slate-600 shrink-0">Select Event:</span>
            {loadingSessions ? (
              <span className="text-slate-400">Loading events list...</span>
            ) : distinctEvents.length === 0 ? (
              <span className="text-slate-400">No events found</span>
            ) : (
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white max-w-xs sm:max-w-md truncate"
              >
                {distinctEvents.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name} ({evt.id})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={loading || !eventSummary}
            className="text-xs font-semibold gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsPrintModalOpen(true)}
            disabled={loading || !eventSummary}
            className="text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20"
          >
            <Printer className="size-3.5" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* Main Content View */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 py-20 flex flex-col items-center justify-center">
          <Loading label="Aggregating event participation & competition metrics..." />
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center space-y-3">
          <div className="size-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="size-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Event Report Error</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
        </div>
      ) : !eventSummary ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 py-16 text-center text-slate-400">
          <Calendar className="size-10 mx-auto mb-3 text-slate-300" />
          <h3 className="text-sm font-bold text-slate-700">No Event Selected</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Choose an event from the dropdown above to view participation breakdown and competition statistics.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Event Header Banner */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {eventSummary.eventId}
                </span>
                {eventSummary.subEventName && (
                  <span className="text-xs text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    Track: {eventSummary.subEventName}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                {eventSummary.eventName}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Coders Club CIET &bull; Event Participation & Performance Analysis
              </p>
            </div>
          </div>

          {/* Overview KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Users className="size-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Attendees
                </div>
                <div className="text-2xl font-extrabold text-slate-900 font-mono">
                  {eventSummary.totalRegisteredOrAttended}
                </div>
                <div className="text-[11px] text-slate-400">Total verified presence</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-12 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <GraduationCap className="size-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Student Participants
                </div>
                <div className="text-2xl font-extrabold text-slate-900 font-mono">
                  {eventSummary.studentAttendanceCount}
                </div>
                <div className="text-[11px] text-slate-400">Enrolled CIET students</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Sparkles className="size-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Coordinators & Staff
                </div>
                <div className="text-2xl font-extrabold text-slate-900 font-mono">
                  {eventSummary.associateAttendanceCount}
                </div>
                <div className="text-[11px] text-slate-400">Associates on duty</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Trophy className="size-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Competition Scored
                </div>
                <div className="text-2xl font-extrabold text-amber-700 font-mono">
                  {eventSummary.scoreStatistics ? eventSummary.scoreStatistics.totalScored : 0}
                </div>
                <div className="text-[11px] text-amber-600 font-medium">Evaluated entries</div>
              </div>
            </div>
          </div>

          {/* Department Breakdown Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Department Participation Breakdown</h3>
                <p className="text-[11px] text-slate-500">Distribution of attendees across engineering branches</p>
              </div>
              <Building2 className="size-5 text-indigo-500" />
            </div>

            {Object.keys(eventSummary.departmentBreakdown).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No department breakdown available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(eventSummary.departmentBreakdown).map(([dept, count]) => {
                  const total = eventSummary.studentAttendanceCount || 1;
                  const pct = Math.round((count / total) * 100);

                  return (
                    <div key={dept} className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-800 font-bold">{dept}</span>
                        <span className="font-mono text-slate-600">
                          {count} students ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Academic Year Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Academic Year Distribution</h3>
                <p className="text-[11px] text-slate-500">Attendee split by year of study</p>
              </div>
              <Layers className="size-5 text-purple-500" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((year) => {
                const count = eventSummary.yearBreakdown[year] || 0;
                const total = eventSummary.studentAttendanceCount || 1;
                const pct = Math.round((count / total) * 100);

                return (
                  <div key={year} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Year {year}
                    </div>
                    <div className="text-2xl font-extrabold text-slate-900 font-mono my-1">
                      {count}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">{pct}% of students</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Competition Score Statistics (if present) */}
          {eventSummary.scoreStatistics && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Competition Evaluation Marks Statistics</h3>
                  <p className="text-[11px] text-slate-500">Summary statistics for graded submissions</p>
                </div>
                <Trophy className="size-5 text-amber-500" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-center">
                  <div className="text-[11px] font-sans font-bold text-amber-800 uppercase">Max Possible</div>
                  <div className="text-2xl font-black text-amber-900 mt-1">
                    {eventSummary.scoreStatistics.maxPossibleScore}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-center">
                  <div className="text-[11px] font-sans font-bold text-emerald-800 uppercase">Highest Score</div>
                  <div className="text-2xl font-black text-emerald-900 mt-1">
                    {eventSummary.scoreStatistics.highestScore}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[11px] font-sans font-bold text-slate-700 uppercase">Lowest Score</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {eventSummary.scoreStatistics.lowestScore}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 text-center">
                  <div className="text-[11px] font-sans font-bold text-indigo-800 uppercase">Average Score</div>
                  <div className="text-2xl font-black text-indigo-900 mt-1">
                    {eventSummary.scoreStatistics.averageScore}
                    <span className="text-xs font-normal text-indigo-600 block">
                      ({eventSummary.scoreStatistics.averagePercentage}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Printable Sheet Modal */}
      {eventSummary && (
        <ReportPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          title="Event Participation & Performance Summary Report"
          subtitle={`Institutional Event Audit — ${eventSummary.eventName} (${eventSummary.eventId})`}
          onExportCSV={handleExportCSV}
        >
          <div className="space-y-6">
            {/* Event Summary Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs font-sans bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-white print:border-slate-300">
              <div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-slate-700 w-32">Event Title:</span>
                  <span className="font-semibold text-slate-900">{eventSummary.eventName}</span>
                </div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-slate-700 w-32">Event ID:</span>
                  <span className="font-mono text-slate-900">{eventSummary.eventId}</span>
                </div>
                {eventSummary.subEventName && (
                  <div className="flex gap-2 py-0.5">
                    <span className="font-bold text-slate-700 w-32">Sub-Event / Track:</span>
                    <span className="text-slate-900">{eventSummary.subEventName}</span>
                  </div>
                )}
              </div>
              <div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-slate-700 w-36">Total Attendees:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {eventSummary.totalRegisteredOrAttended}
                  </span>
                </div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-slate-700 w-36">Student Attendees:</span>
                  <span className="font-mono text-indigo-700">{eventSummary.studentAttendanceCount}</span>
                </div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-slate-700 w-36">Associate Attendees:</span>
                  <span className="font-mono text-purple-700">{eventSummary.associateAttendanceCount}</span>
                </div>
              </div>
            </div>

            {/* Department Breakdown Table */}
            <div>
              <h4 className="font-bold uppercase text-[11px] text-slate-700 mb-2 font-sans">
                Department Participation Breakdown
              </h4>
              <table className="w-full text-left text-xs border border-slate-300 font-sans">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px] text-slate-700">
                    <th className="py-2 px-3 border-r border-slate-300">Department Name</th>
                    <th className="py-2 px-3 border-r border-slate-300 text-center w-32">Attendee Count</th>
                    <th className="py-2 px-3 text-center w-32">Share (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {Object.entries(eventSummary.departmentBreakdown).map(([dept, count]) => {
                    const total = eventSummary.studentAttendanceCount || 1;
                    const pct = Math.round((count / total) * 100);

                    return (
                      <tr key={dept} className="hover:bg-slate-50">
                        <td className="py-1.5 px-3 border-r border-slate-200 font-semibold text-slate-900">
                          {dept}
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-200 text-center font-mono">
                          {count}
                        </td>
                        <td className="py-1.5 px-3 text-center font-mono">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Competition Scores if present */}
            {eventSummary.scoreStatistics && (
              <div>
                <h4 className="font-bold uppercase text-[11px] text-slate-700 mb-2 font-sans">
                  Competition Evaluation Statistics
                </h4>
                <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono border border-slate-300 p-3 rounded-lg">
                  <div>
                    <span className="text-[10px] font-sans text-slate-500 block">Participants</span>
                    <span className="font-bold text-slate-900">{eventSummary.scoreStatistics.totalScored}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-sans text-slate-500 block">Highest</span>
                    <span className="font-bold text-emerald-700">{eventSummary.scoreStatistics.highestScore}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-sans text-slate-500 block">Lowest</span>
                    <span className="font-bold text-slate-700">{eventSummary.scoreStatistics.lowestScore}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-sans text-slate-500 block">Average</span>
                    <span className="font-bold text-indigo-700">
                      {eventSummary.scoreStatistics.averageScore} ({eventSummary.scoreStatistics.averagePercentage}%)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ReportPrintModal>
      )}
    </div>
  );
}
