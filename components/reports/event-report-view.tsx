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
      <div className="bg-[#111318] rounded-xl border border-[#292D33] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="flex items-center gap-2 text-xs text-[#9B9EA6]">
            <span className="font-mono text-[11px] uppercase tracking-wider shrink-0">Select Event:</span>
            {loadingSessions ? (
              <span className="text-[#686C74]">Loading events list...</span>
            ) : distinctEvents.length === 0 ? (
              <span className="text-[#686C74]">No events found</span>
            ) : (
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="px-3 py-1.5 bg-[#0D0F12] border border-[#292D33] rounded-lg text-xs font-mono text-[#F3F1EC] focus:outline-none focus:border-[#FF2A1A]/50 max-w-xs sm:max-w-md truncate"
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
            className="bg-[#FF2A1A] hover:bg-[#C51D16] text-white font-mono text-[11px] uppercase tracking-wider px-4 py-2 rounded-lg border-0"
          >
            <Download className="size-3.5 mr-1.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsPrintModalOpen(true)}
            disabled={loading || !eventSummary}
            className="bg-[#0D0F12] hover:bg-[#1D2026] text-[#F3F1EC] font-mono text-[11px] uppercase tracking-wider px-4 py-2 rounded-lg border border-[#292D33]"
          >
            <Printer className="size-3.5 mr-1.5" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* Main Content View */}
      {loading ? (
        <div className="bg-[#111318] rounded-xl border border-[#292D33] py-20 flex flex-col items-center justify-center">
          <Loading label="Aggregating event participation & competition metrics..." />
        </div>
      ) : error ? (
        <div className="bg-[#111318] rounded-xl border border-[#292D33] p-8 text-center space-y-3">
          <div className="size-12 rounded-full bg-[#FF2A1A]/10 text-[#FF2A1A] flex items-center justify-center mx-auto border border-[#FF2A1A]/20">
            <AlertCircle className="size-6" />
          </div>
          <h3 className="text-sm font-bold text-[#F3F1EC]">Event Report Error</h3>
          <p className="text-xs text-[#9B9EA6] max-w-md mx-auto">{error}</p>
        </div>
      ) : !eventSummary ? (
        <div className="bg-[#111318] rounded-xl border border-[#292D33] py-16 text-center text-[#686C74]">
          <Calendar className="size-10 mx-auto mb-3 text-[#3A3E45]" />
          <h3 className="text-sm font-bold text-[#F3F1EC]">No Event Selected</h3>
          <p className="text-xs text-[#9B9EA6] max-w-md mx-auto mt-1">
            Choose an event from the dropdown above to view participation breakdown and competition statistics.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Event Header Banner */}
          <div className="bg-[#111318] rounded-xl border border-[#292D33] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#FF2A1A]/10 text-[#FF2A1A] border border-[#FF2A1A]/20">
                  {eventSummary.eventId}
                </span>
                {eventSummary.subEventName && (
                  <span className="text-[11px] font-mono text-[#7FA7FF] bg-[#7FA7FF]/10 px-2 py-0.5 rounded-full border border-[#7FA7FF]/20">
                    Track: {eventSummary.subEventName}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-display font-extrabold text-[#F3F1EC]">
                {eventSummary.eventName}
              </h2>
              <p className="text-xs text-[#686C74] mt-1 font-mono">
                Coders Club CIET &bull; Event Participation & Performance Analysis
              </p>
            </div>
          </div>

          {/* Overview KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#111318] p-5 rounded-2xl border border-[#292D33] flex items-center gap-4">
              <div className="size-12 rounded-xl bg-[#0D0F12] border border-[#292D33] text-[#F3F1EC] flex items-center justify-center shrink-0">
                <Users className="size-6" />
              </div>
              <div>
                <div className="text-[11px] font-mono font-semibold text-[#9B9EA6] uppercase tracking-wider">
                  Total Attendees
                </div>
                <div className="text-2xl font-extrabold text-[#F3F1EC] font-mono mt-1">
                  {eventSummary.totalRegisteredOrAttended}
                </div>
              </div>
            </div>

            <div className="bg-[#111318] p-5 rounded-2xl border border-[#292D33] flex items-center gap-4">
              <div className="size-12 rounded-xl bg-[#0D0F12] border border-[#292D33] text-[#F3F1EC] flex items-center justify-center shrink-0">
                <GraduationCap className="size-6" />
              </div>
              <div>
                <div className="text-[11px] font-mono font-semibold text-[#9B9EA6] uppercase tracking-wider">
                  Student Participants
                </div>
                <div className="text-2xl font-extrabold text-[#F3F1EC] font-mono mt-1">
                  {eventSummary.studentAttendanceCount}
                </div>
              </div>
            </div>

            <div className="bg-[#111318] p-5 rounded-2xl border border-[#292D33] flex items-center gap-4">
              <div className="size-12 rounded-xl bg-[#0D0F12] border border-[#292D33] text-[#F3F1EC] flex items-center justify-center shrink-0">
                <Sparkles className="size-6" />
              </div>
              <div>
                <div className="text-[11px] font-mono font-semibold text-[#9B9EA6] uppercase tracking-wider">
                  Coordinators & Staff
                </div>
                <div className="text-2xl font-extrabold text-[#F3F1EC] font-mono mt-1">
                  {eventSummary.associateAttendanceCount}
                </div>
              </div>
            </div>

            <div className="bg-[#111318] p-5 rounded-2xl border border-[#292D33] flex items-center gap-4">
              <div className="size-12 rounded-xl bg-[#0D0F12] border border-[#292D33] text-[#F2B84B] flex items-center justify-center shrink-0">
                <Trophy className="size-6" />
              </div>
              <div>
                <div className="text-[11px] font-mono font-semibold text-[#9B9EA6] uppercase tracking-wider">
                  Competition Scored
                </div>
                <div className="text-2xl font-extrabold text-[#F2B84B] font-mono mt-1">
                  {eventSummary.scoreStatistics ? eventSummary.scoreStatistics.totalScored : 0}
                </div>
              </div>
            </div>
          </div>

          {/* Department Breakdown Section */}
          <div className="bg-[#111318] rounded-xl border border-[#292D33] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#F3F1EC]">Department Participation Breakdown</h3>
                <p className="text-[11px] font-mono mt-1 text-[#9B9EA6]">Distribution of attendees across engineering branches</p>
              </div>
              <Building2 className="size-5 text-[#FF2A1A]" />
            </div>

            {Object.keys(eventSummary.departmentBreakdown).length === 0 ? (
              <p className="text-xs text-[#686C74] py-4 text-center">No department breakdown available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(eventSummary.departmentBreakdown).map(([dept, count]) => {
                  const total = eventSummary.studentAttendanceCount || 1;
                  const pct = Math.round((count / total) * 100);

                  return (
                    <div key={dept} className="space-y-1.5 p-3 rounded-xl bg-[#0D0F12] border border-[#292D33]">
                      <div className="flex items-center justify-between text-xs font-mono font-semibold">
                        <span className="text-[#F3F1EC] font-bold uppercase">{dept}</span>
                        <span className="text-[#9B9EA6]">
                          {count} students ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[#1D2026] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FF2A1A] rounded-full transition-all duration-500"
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
          <div className="bg-[#111318] rounded-xl border border-[#292D33] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#F3F1EC]">Academic Year Distribution</h3>
                <p className="text-[11px] font-mono mt-1 text-[#9B9EA6]">Attendee split by year of study</p>
              </div>
              <Layers className="size-5 text-[#7FA7FF]" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((year) => {
                const count = eventSummary.yearBreakdown[year] || 0;
                const total = eventSummary.studentAttendanceCount || 1;
                const pct = Math.round((count / total) * 100);

                return (
                  <div key={year} className="bg-[#0D0F12] border border-[#292D33] rounded-xl p-4 text-center">
                    <div className="text-[11px] font-mono font-bold text-[#9B9EA6] uppercase tracking-wider">
                      Year {year}
                    </div>
                    <div className="text-2xl font-extrabold text-[#F3F1EC] font-mono my-1">
                      {count}
                    </div>
                    <div className="text-[11px] text-[#686C74] font-mono">{pct}% of students</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Competition Score Statistics (if present) */}
          {eventSummary.scoreStatistics && (
            <div className="bg-[#111318] rounded-xl border border-[#292D33] p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#F3F1EC]">Competition Evaluation Marks Statistics</h3>
                  <p className="text-[11px] font-mono mt-1 text-[#9B9EA6]">Summary statistics for graded submissions</p>
                </div>
                <Trophy className="size-5 text-[#F2B84B]" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
                <div className="p-4 rounded-xl bg-[#F2B84B]/10 border border-[#F2B84B]/30 text-center">
                  <div className="text-[11px] font-mono font-bold text-[#F2B84B] uppercase">Max Possible</div>
                  <div className="text-2xl font-black text-[#F2B84B] mt-1">
                    {eventSummary.scoreStatistics.maxPossibleScore}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#32C979]/10 border border-[#32C979]/30 text-center">
                  <div className="text-[11px] font-mono font-bold text-[#32C979] uppercase">Highest Score</div>
                  <div className="text-2xl font-black text-[#32C979] mt-1">
                    {eventSummary.scoreStatistics.highestScore}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0D0F12] border border-[#292D33] text-center">
                  <div className="text-[11px] font-mono font-bold text-[#9B9EA6] uppercase">Lowest Score</div>
                  <div className="text-2xl font-black text-[#F3F1EC] mt-1">
                    {eventSummary.scoreStatistics.lowestScore}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#7FA7FF]/10 border border-[#7FA7FF]/30 text-center">
                  <div className="text-[11px] font-mono font-bold text-[#7FA7FF] uppercase">Average Score</div>
                  <div className="text-2xl font-black text-[#7FA7FF] mt-1">
                    {eventSummary.scoreStatistics.averageScore}
                    <span className="text-[10px] block mt-1">
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
            <div className="grid grid-cols-2 gap-4 text-xs font-sans bg-[#08090B] p-4 rounded-xl border border-[#292D33] print:bg-[#111318] print:border-[#3A3E45]">
              <div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-[#9B9EA6] w-32">Event Title:</span>
                  <span className="font-semibold text-[#F3F1EC]">{eventSummary.eventName}</span>
                </div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-[#9B9EA6] w-32">Event ID:</span>
                  <span className="font-mono text-[#F3F1EC]">{eventSummary.eventId}</span>
                </div>
                {eventSummary.subEventName && (
                  <div className="flex gap-2 py-0.5">
                    <span className="font-bold text-[#9B9EA6] w-32">Sub-Event / Track:</span>
                    <span className="text-[#F3F1EC]">{eventSummary.subEventName}</span>
                  </div>
                )}
              </div>
              <div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-[#9B9EA6] w-36">Total Attendees:</span>
                  <span className="font-mono font-bold text-[#F3F1EC]">
                    {eventSummary.totalRegisteredOrAttended}
                  </span>
                </div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-[#9B9EA6] w-36">Student Attendees:</span>
                  <span className="font-mono text-[#7FA7FF]">{eventSummary.studentAttendanceCount}</span>
                </div>
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-[#9B9EA6] w-36">Associate Attendees:</span>
                  <span className="font-mono text-purple-700">{eventSummary.associateAttendanceCount}</span>
                </div>
              </div>
            </div>

            {/* Department Breakdown Table */}
            <div>
              <h4 className="font-bold uppercase text-[11px] text-[#9B9EA6] mb-2 font-sans">
                Department Participation Breakdown
              </h4>
              <table className="w-full text-left text-xs border border-[#3A3E45] font-sans">
                <thead>
                  <tr className="bg-[#171A20] border-b border-[#3A3E45] font-bold uppercase text-[10px] text-[#9B9EA6]">
                    <th className="py-2 px-3 border-r border-[#3A3E45]">Department Name</th>
                    <th className="py-2 px-3 border-r border-[#3A3E45] text-center w-32">Attendee Count</th>
                    <th className="py-2 px-3 text-center w-32">Share (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {Object.entries(eventSummary.departmentBreakdown).map(([dept, count]) => {
                    const total = eventSummary.studentAttendanceCount || 1;
                    const pct = Math.round((count / total) * 100);

                    return (
                      <tr key={dept} className="hover:bg-[#08090B]">
                        <td className="py-1.5 px-3 border-r border-[#292D33] font-semibold text-[#F3F1EC]">
                          {dept}
                        </td>
                        <td className="py-1.5 px-3 border-r border-[#292D33] text-center font-mono">
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
                <h4 className="font-bold uppercase text-[11px] text-[#9B9EA6] mb-2 font-sans">
                  Competition Evaluation Statistics
                </h4>
                <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono border border-[#3A3E45] p-3 rounded-lg">
                  <div>
                    <span className="text-[10px] font-sans text-[#686C74] block">Participants</span>
                    <span className="font-bold text-[#F3F1EC]">{eventSummary.scoreStatistics.totalScored}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-sans text-[#686C74] block">Highest</span>
                    <span className="font-bold text-emerald-700">{eventSummary.scoreStatistics.highestScore}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-sans text-[#686C74] block">Lowest</span>
                    <span className="font-bold text-[#9B9EA6]">{eventSummary.scoreStatistics.lowestScore}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-sans text-[#686C74] block">Average</span>
                    <span className="font-bold text-[#7FA7FF]">
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
