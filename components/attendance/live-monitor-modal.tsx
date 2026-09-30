"use client";

import React, { useEffect, useState } from "react";
import { AttendanceRecord, AttendanceSession } from "@/lib/attendance/types";
import { attendanceService } from "@/lib/attendance/attendance-service";
import { Button } from "@/components/ui/button";
import {
  Activity,
  CheckCircle2,
  GraduationCap,
  Radio,
  Search,
  UserCheck,
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

    // Subscribe to live attendee entries via Supabase Realtime
    const unsubscribe = attendanceService.subscribeToLiveAttendees(session.id, (newRecord) => {
      setRecords((prev) => [newRecord, ...prev.filter((r) => r.id !== newRecord.id)]);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [session.id]);

  // Derived counts
  const studentCount = records.filter((r) => r.attendeeType === "student").length;
  const associateCount = records.filter((r) => r.attendeeType === "associate").length;

  const filteredRecords = records.filter((r) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.studentRegNo?.toLowerCase().includes(query) ||
      r.studentName?.toLowerCase().includes(query) ||
      r.associateName?.toLowerCase().includes(query) ||
      r.studentDepartment?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Activity className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{session.sessionName}</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                  <Radio className="size-3 animate-pulse text-emerald-600" />
                  Live Realtime
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {session.eventName} &bull; <span className="capitalize">{session.period} Period</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="size-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Total Present</div>
              <div className="text-xl font-extrabold text-slate-900">{records.length}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <GraduationCap className="size-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Students</div>
              <div className="text-xl font-extrabold text-slate-900">{studentCount}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <UserCheck className="size-4" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Associates</div>
              <div className="text-xl font-extrabold text-slate-900">{associateCount}</div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Reg No, Name, Dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Showing {filteredRecords.length} of {records.length} records
          </div>
        </div>

        {/* Realtime Attendee Table */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="size-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Connecting to Supabase Realtime...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-3 rounded-full bg-slate-100 text-slate-400 mb-2">
                <Users className="size-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No attendance recorded yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Attendees will appear here in real time as they scan the QR code.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Attendee</th>
                  <th className="py-2.5 px-3">Class / Role</th>
                  <th className="py-2.5 px-3">Verification</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      {record.attendeeType === "student" ? (
                        <div>
                          <div className="font-semibold text-slate-800">{record.studentName}</div>
                          <div className="font-mono text-[11px] text-slate-400">
                            {record.studentRegNo}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold text-slate-800">{record.associateName}</div>
                          <div className="text-[11px] text-purple-600 font-medium">Associate</div>
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      {record.attendeeType === "student" ? (
                        <span className="text-slate-600 font-medium">
                          {record.studentDepartment} &bull; Yr {record.studentYear} ({record.studentSection})
                        </span>
                      ) : (
                        <span className="text-slate-500">Club Executive</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        <CheckCircle2 className="size-3 text-indigo-600" />
                        {record.verificationMethod === "qr_scan" ? "QR Scanned" : "Manual"}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        Present
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(record.markedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 bg-slate-50 border-t border-slate-100 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Monitor
          </Button>
        </div>
      </div>
    </div>
  );
}
