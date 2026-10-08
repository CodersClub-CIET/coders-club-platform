"use client";

import React, { useEffect, useState } from "react";
import { AttendanceRecord, AttendanceSession, AttendanceStatus } from "@/lib/attendance/types";
import { attendanceService } from "@/lib/attendance/attendance-service";
import { Button } from "@/components/ui/button";
import ManualEntryModal from "@/components/attendance/manual-entry-modal";
import ODReportModal from "@/components/attendance/od-report-modal";
import {
  Activity,
  BarChart2,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  Radio,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
  Clock,
} from "lucide-react";

interface LiveMonitorModalProps {
  session: AttendanceSession;
  onClose: () => void;
}

export default function LiveMonitorModal({ session, onClose }: LiveMonitorModalProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [attendeeFilter, setAttendeeFilter] = useState<"all" | "student" | "associate">("all");
  const [showManualModal, setShowManualModal] = useState(false);
  const [showODModal, setShowODModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchInitialRecords() {
      try {
        setLoading(true);
        const data = await attendanceService.getSessionRecords(session.id);
        if (isMounted) {
          setRecords(data);
          setLoading(false);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    }

    fetchInitialRecords();

    // Subscribe to live attendee entries via Supabase Realtime + BroadcastChannel
    const unsubscribe = attendanceService.subscribeToLiveAttendees(
      session.id,
      (newRecord) => {
        setRecords((prev) => [newRecord, ...prev.filter((r) => r.id !== newRecord.id)]);
      },
      (updatedRecord) => {
        setRecords((prev) => prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r)));
      },
      (deletedId) => {
        setRecords((prev) => prev.filter((r) => r.id !== deletedId));
      }
    );

    // Also poll every 2 seconds to catch submissions from phones/other devices on the network
    const interval = setInterval(async () => {
      try {
        const fresh = await attendanceService.getSessionRecords(session.id);
        if (isMounted) {
          setRecords(fresh);
        }
      } catch {
        // ignore
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      unsubscribe();
    };
  }, [session.id]);

  const handleStatusChange = async (recordId: string, newStatus: AttendanceStatus) => {
    try {
      const updated = await attendanceService.updateRecordStatus(recordId, newStatus);
      setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update attendee status.");
    }
  };

  const handleDeleteRecord = async (recordId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove attendance for "${name}"?`)) {
      return;
    }
    try {
      await attendanceService.deleteRecord(recordId);
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove record.");
    }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      await attendanceService.downloadSessionCSV(session.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to download attendance sheet.");
    } finally {
      setExporting(false);
    }
  };

  const handleManualRecordCreated = (newRecord: AttendanceRecord) => {
    setRecords((prev) => [newRecord, ...prev.filter((r) => r.id !== newRecord.id)]);
  };

  // Department distribution
  const deptCounts = records.reduce<Record<string, number>>((acc, r) => {
    const dept = r.studentDepartment || "Executive";
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  // Derived counts
  const studentCount = records.filter((r) => r.attendeeType === "student").length;
  const associateCount = records.filter((r) => r.attendeeType === "associate").length;

  const filteredRecords = records.filter((r) => {
    if (attendeeFilter !== "all" && r.attendeeType !== attendeeFilter) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.studentRegNo?.toLowerCase().includes(query) ||
      r.studentName?.toLowerCase().includes(query) ||
      r.associateName?.toLowerCase().includes(query) ||
      r.associateUserId?.toLowerCase().includes(query) ||
      r.studentDepartment?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-[#111318] shadow-2xl border border-[#292D33] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#292D33] px-6 py-4 bg-[#08090B]/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Activity className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#F3F1EC]">{session.sessionName}</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                  <Radio className="size-3 animate-pulse text-emerald-600" />
                  Live Realtime
                </span>
              </div>
              <p className="text-xs text-[#686C74]">
                {session.eventName} &bull; <span className="capitalize">{session.period} Period</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session.isActive && (
              <Button
                type="button"
                size="sm"
                onClick={() => setShowManualModal(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
              >
                <UserPlus className="size-3.5" />
                Manual Entry
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowODModal(true)}
              className="text-xs font-semibold text-[#9B9EA6] gap-1.5 border-[#292D33] hover:bg-[#171A20]"
              title="Generate Official On-Duty (OD) Sheet for HODs/Faculty"
            >
              <FileText className="size-3.5 text-[#FF2A1A]" />
              OD Report
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={exporting || records.length === 0}
              className="text-xs font-semibold text-[#9B9EA6] gap-1.5 border-[#292D33] hover:bg-[#171A20]"
              title="Download CSV for OD / College Records"
            >
              <Download className="size-3.5 text-[#FF2A1A]" />
              {exporting ? "Exporting..." : "Export CSV"}
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#686C74] hover:text-[#9B9EA6] hover:bg-[#171A20] transition-colors ml-1"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 px-6 py-4 border-b border-[#292D33] bg-[#111318] shrink-0">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#08090B] border border-[#292D33]">
            <div className="p-2 rounded-lg bg-[#FF2A1A]/10 text-[#FF2A1A]">
              <GraduationCap className="size-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-[#686C74]">Verified Students</div>
              <div className="text-xl font-extrabold text-[#F3F1EC]">{records.length}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#08090B] border border-[#292D33]">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <BarChart2 className="size-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-[#686C74]">Departments Represented</div>
              <div className="text-xl font-extrabold text-[#F3F1EC]">{Object.keys(deptCounts).length}</div>
            </div>
          </div>
        </div>

        {/* Department Distribution Strip */}
        {records.length > 0 && Object.keys(deptCounts).length > 0 && (
          <div className="px-6 py-2 bg-[#08090B] border-b border-[#292D33] flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0">
            <span className="text-[#686C74] font-semibold uppercase text-[10px] tracking-wider shrink-0 flex items-center gap-1 mr-1">
              <BarChart2 className="size-3 text-[#FF2A1A]" />
              Depts:
            </span>
            {Object.entries(deptCounts).map(([dept, count]) => (
              <span
                key={dept}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#111318] border border-[#292D33] text-[#9B9EA6] font-medium shrink-0"
              >
                <span>{dept}</span>
                <span className="font-bold text-[#FF2A1A] bg-[#FF2A1A]/10 px-1 rounded text-[10px]">
                  {count}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="px-6 py-3 border-b border-[#292D33] bg-[#08090B]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 size-4 text-[#686C74]" />
              <input
                type="text"
                placeholder="Search Reg No, Name, Dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#111318] border border-[#292D33] rounded-lg text-[#F3F1EC] placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#111318] p-1 rounded-lg border border-[#292D33]">
              <button
                type="button"
                onClick={() => setAttendeeFilter("all")}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  attendeeFilter === "all"
                    ? "bg-[#08090B] text-white"
                    : "text-[#9B9EA6] hover:bg-[#171A20]"
                }`}
              >
                All ({records.length})
              </button>
              <button
                type="button"
                onClick={() => setAttendeeFilter("student")}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  attendeeFilter === "student"
                    ? "bg-[#FF2A1A] text-white"
                    : "text-[#9B9EA6] hover:bg-[#171A20]"
                }`}
              >
                Participants ({studentCount})
              </button>
              <button
                type="button"
                onClick={() => setAttendeeFilter("associate")}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  attendeeFilter === "associate"
                    ? "bg-purple-600 text-white"
                    : "text-[#9B9EA6] hover:bg-[#171A20]"
                }`}
              >
                Coordinators ({associateCount})
              </button>
            </div>
          </div>

          <div className="text-xs text-[#686C74] font-mono">
            Showing {filteredRecords.length} records
          </div>
        </div>

        {/* Realtime Attendee Table */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="size-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
              <p className="text-xs text-[#686C74] font-medium">Connecting to Supabase Realtime...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-3 rounded-full bg-[#171A20] text-[#686C74] mb-2">
                <Users className="size-6" />
              </div>
              <p className="text-sm font-semibold text-[#9B9EA6]">No attendance recorded yet</p>
              <p className="text-xs text-[#686C74] mt-1">
                Attendees will appear here in real time as they scan the QR code or are added manually.
              </p>
              {session.isActive && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManualModal(true)}
                  className="mt-3 text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                >
                  <UserPlus className="size-3.5 mr-1" />
                  Add First Attendee Manually
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#292D33] text-[#686C74] font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Attendee</th>
                  <th className="py-2.5 px-3">Class / Role</th>
                  <th className="py-2.5 px-3">Verification</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Time</th>
                  <th className="py-2.5 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-[#08090B]/80 transition-colors">
                    <td className="py-2.5 px-3">
                      {record.attendeeType === "student" ? (
                        <div>
                          <div className="font-semibold text-[#F3F1EC]">{record.studentName}</div>
                          <div className="font-mono text-[11px] text-[#686C74]">
                            {record.studentRegNo}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold text-[#F3F1EC]">{record.associateName}</div>
                          <div className="text-[11px] text-purple-600 font-mono font-medium">
                            {record.associateUserId || "Associate"}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      {record.attendeeType === "student" ? (
                        <span className="text-[#9B9EA6] font-medium">
                          {record.studentDepartment} &bull; {record.studentYear} ({record.studentSection})
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                            {record.markedBy?.replace(" (Self Scan)", "") || "Associate"}
                          </span>
                          {record.studentDepartment && (
                            <span className="text-[#686C74] font-medium">{record.studentDepartment}</span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      {record.verificationMethod === "manual_entry" ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <UserCheck className="size-3 text-amber-600" />
                            Manual Entry
                          </span>
                          {record.markedBy && (
                            <div className="text-[10px] text-[#686C74] mt-0.5">
                              By {record.markedBy}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-[#FF2A1A]/10 px-2 py-0.5 rounded border border-indigo-100">
                          <CheckCircle2 className="size-3 text-[#FF2A1A]" />
                          QR Scanned
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <select
                        value={record.status}
                        onChange={(e) => handleStatusChange(record.id, e.target.value as AttendanceStatus)}
                        className={`text-[10px] font-bold rounded-lg px-2 py-0.5 border cursor-pointer focus:outline-none transition-colors ${
                          record.status === "present"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : record.status === "late"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="excused">Excused</option>
                      </select>
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-[#686C74]">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(record.markedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </td>

                    <td className="py-2.5 px-2 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteRecord(
                            record.id,
                            record.studentName || record.associateName || "this attendee"
                          )
                        }
                        className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Remove attendee"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-[#08090B] border-t border-[#292D33] shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={exporting || records.length === 0}
            className="text-xs text-[#9B9EA6] gap-1.5"
          >
            <Download className="size-3.5" />
            Download OD Sheet (.csv)
          </Button>

          <Button variant="outline" size="sm" onClick={onClose}>
            Close Monitor
          </Button>
        </div>
      </div>

      {/* Manual Attendance Entry Modal */}
      {showManualModal && (
        <ManualEntryModal
          session={session}
          onClose={() => setShowManualModal(false)}
          onRecordCreated={handleManualRecordCreated}
        />
      )}

      {/* Official On-Duty (OD) Report Modal */}
      {showODModal && (
        <ODReportModal
          session={session}
          isOpen={showODModal}
          onClose={() => setShowODModal(false)}
        />
      )}
    </div>
  );
}
