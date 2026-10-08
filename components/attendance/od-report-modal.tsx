"use client";

import React, { useEffect, useState } from "react";
import { AttendanceRecord, AttendanceSession } from "@/lib/attendance/types";
import { attendanceService } from "@/lib/attendance/attendance-service";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileText,
  Printer,
  X,
  Building,
  GraduationCap,
  Calendar,
  Users,
  CheckCircle2,
} from "lucide-react";

interface ODReportModalProps {
  session: AttendanceSession;
  isOpen: boolean;
  onClose: () => void;
}

export default function ODReportModal({ session, isOpen, onClose }: ODReportModalProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState<string>("all");

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadData() {
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

    loadData();
    return () => {
      isMounted = false;
    };
  }, [session.id, isOpen]);

  if (!isOpen) return null;

  const studentRecords = records.filter((r) => r.attendeeType === "student");
  const associateRecords = records.filter((r) => r.attendeeType === "associate");

  const filteredStudents =
    deptFilter === "all"
      ? studentRecords
      : studentRecords.filter((r) => r.studentDepartment === deptFilter);

  const departmentsPresent = Array.from(
    new Set(studentRecords.map((r) => r.studentDepartment).filter(Boolean))
  );

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    attendanceService.downloadSessionCSV(session.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#08090B]/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-[#111318] print:static">
      <div className="relative w-full max-w-4xl bg-[#111318] rounded-2xl shadow-2xl border border-[#292D33] overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Top Modal Controls (Hidden in Print) */}
        <div className="px-6 py-4 bg-[#08090B] text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold">Official On-Duty (OD) Report</h2>
              <p className="text-[11px] text-[#686C74]">
                Departmental submission format for CIET Faculty & HODs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadCSV}
              className="text-xs bg-[#1D2026] border-slate-700 text-slate-200 hover:bg-slate-700 gap-1.5"
            >
              <Download className="size-3.5" />
              CSV
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="text-xs bg-[#FF2A1A] hover:bg-[#FF2A1A] text-white gap-1.5 font-bold shadow-md shadow-indigo-600/30"
            >
              <Printer className="size-3.5" />
              Print / Save PDF
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#686C74] hover:text-white hover:bg-[#1D2026] transition-colors ml-2"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar (Hidden in Print) */}
        <div className="px-6 py-2.5 bg-[#08090B] border-b border-[#292D33] flex items-center justify-between text-xs print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#9B9EA6]">Filter Department:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-2.5 py-1 bg-[#111318] border border-[#3A3E45] rounded-lg text-[#F3F1EC] focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Departments ({studentRecords.length})</option>
              {departmentsPresent.map((dept) => (
                <option key={dept} value={dept}>
                  {dept} ({studentRecords.filter((s) => s.studentDepartment === dept).length})
                </option>
              ))}
            </select>
          </div>
          <div className="text-[#686C74] text-[11px]">
            Showing <span className="font-bold text-[#F3F1EC]">{filteredStudents.length}</span> students
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 sm:p-12 overflow-y-auto flex-1 font-serif text-[#F3F1EC] bg-[#111318] print:p-0 print:overflow-visible">
          {/* CIET Institutional Header */}
          <div className="text-center pb-6 border-b-2 border-slate-800 mb-6">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-[#F3F1EC] font-sans">
              Coimbatore Institute of Engineering and Technology
            </h1>
            <p className="text-xs text-[#9B9EA6] font-sans mt-0.5 uppercase tracking-wider">
              (Autonomous Institution | Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai)
            </p>
            <p className="text-xs text-[#686C74] font-sans mt-0.5">
              Narasipuram (P.O), Thondamuthur (Via), Vellimalaipattinam, Coimbatore - 641109, Tamil Nadu &bull; Ph: +91 422-2970703
            </p>
            <div className="inline-block mt-3 px-4 py-1 rounded bg-[#171A20] border border-[#3A3E45]">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-widest font-sans text-indigo-900">
                Department of Technical Clubs — Coders Club CIET
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold underline underline-offset-4 mt-3 uppercase font-sans">
              On-Duty (OD) Attendance Verification Sheet
            </h2>
          </div>

          {/* Event Context Table */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-xs font-sans bg-[#08090B] p-4 rounded-xl border border-[#292D33] print:bg-[#111318] print:border-[#3A3E45]">
            <div>
              <div className="flex gap-2 py-0.5">
                <span className="font-bold text-[#9B9EA6] w-28">Event Title:</span>
                <span className="font-semibold text-[#F3F1EC]">{session.eventName}</span>
              </div>
              {session.subEventName && (
                <div className="flex gap-2 py-0.5">
                  <span className="font-bold text-[#9B9EA6] w-28">Sub-Event / Track:</span>
                  <span className="text-[#F3F1EC]">{session.subEventName}</span>
                </div>
              )}
              <div className="flex gap-2 py-0.5">
                <span className="font-bold text-[#9B9EA6] w-28">Session Name:</span>
                <span className="text-[#F3F1EC]">{session.sessionName}</span>
              </div>
            </div>
            <div>
              <div className="flex gap-2 py-0.5">
                <span className="font-bold text-[#9B9EA6] w-28">Date:</span>
                <span className="text-[#F3F1EC]">
                  {new Date(session.startsAt).toLocaleDateString("en-IN", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex gap-2 py-0.5">
                <span className="font-bold text-[#9B9EA6] w-28">Session Period:</span>
                <span className="capitalize font-semibold text-indigo-700">
                  {session.period} Period
                </span>
              </div>
              <div className="flex gap-2 py-0.5">
                <span className="font-bold text-[#9B9EA6] w-28">Total Verified:</span>
                <span className="font-bold text-emerald-700">
                  {studentRecords.length} Students, {associateRecords.length} Coordinators
                </span>
              </div>
            </div>
          </div>

          {/* Student Roster Table */}
          {loading ? (
            <div className="py-12 text-center text-xs text-[#686C74] font-sans">
              Generating attendance roster...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#686C74] font-sans">
              No students recorded in this session.
            </div>
          ) : (
            <table className="w-full text-left text-xs border border-[#3A3E45] font-sans mb-8">
              <thead>
                <tr className="bg-[#171A20] border-b border-[#3A3E45] font-bold uppercase text-[10px] text-[#9B9EA6]">
                  <th className="py-2 px-2.5 border-r border-[#3A3E45] w-10 text-center">S.No</th>
                  <th className="py-2 px-3 border-r border-[#3A3E45] w-32">Register Number</th>
                  <th className="py-2 px-3 border-r border-[#3A3E45]">Student Name</th>
                  <th className="py-2 px-3 border-r border-[#3A3E45] w-20 text-center">Dept</th>
                  <th className="py-2 px-2.5 border-r border-[#3A3E45] w-16 text-center">Year/Sec</th>
                  <th className="py-2 px-3 border-r border-[#3A3E45] w-20 text-center">Time</th>
                  <th className="py-2 px-3 w-24 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-[#08090B]">
                    <td className="py-1.5 px-2.5 border-r border-[#292D33] text-center font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-3 border-r border-[#292D33] font-mono font-semibold text-[#F3F1EC]">
                      {student.studentRegNo}
                    </td>
                    <td className="py-1.5 px-3 border-r border-[#292D33] font-medium text-[#F3F1EC]">
                      {student.studentName}
                    </td>
                    <td className="py-1.5 px-3 border-r border-[#292D33] text-center font-semibold text-[#9B9EA6]">
                      {student.studentDepartment}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-[#292D33] text-center text-[#9B9EA6]">
                      {student.studentYear} ({student.studentSection})
                    </td>
                    <td className="py-1.5 px-3 border-r border-[#292D33] text-center font-mono text-[11px] text-[#686C74]">
                      {new Date(student.markedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      <span className="font-semibold text-emerald-800 text-[10px] uppercase tracking-wider">
                        PRESENT (OD)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Associate / Coordinator Roster */}
          {associateRecords.length > 0 && (
            <div className="mb-8 font-sans">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#9B9EA6] mb-2">
                Event Organizing Team & Associates:
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {associateRecords.map((assoc) => (
                  <div
                    key={assoc.id}
                    className="p-2.5 rounded-lg border border-[#292D33] bg-[#08090B]/60 text-xs"
                  >
                    <div className="font-bold text-[#F3F1EC]">{assoc.associateName}</div>
                    <div className="text-[11px] text-purple-700 font-semibold">
                      {assoc.markedBy?.replace(" (Self Scan)", "") || "Executive"} &bull; {assoc.studentDepartment}
                    </div>
                    <div className="text-[10px] font-mono text-[#686C74]">{assoc.associateUserId}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Official Signatures Footer */}
          <div className="pt-12 mt-12 border-t border-[#3A3E45] font-sans grid grid-cols-3 text-center text-xs text-[#F3F1EC]">
            <div>
              <div className="h-10"></div>
              <div className="font-bold border-t border-slate-400 pt-1.5 mx-4">
                Student Coordinator
              </div>
              <p className="text-[10px] text-[#686C74]">Coders Club CIET</p>
            </div>
            <div>
              <div className="h-10"></div>
              <div className="font-bold border-t border-slate-400 pt-1.5 mx-4">
                Faculty Club Advisor
              </div>
              <p className="text-[10px] text-[#686C74]">Department of CSE / CIET</p>
            </div>
            <div>
              <div className="h-10"></div>
              <div className="font-bold border-t border-slate-400 pt-1.5 mx-4">
                Head of Department (HOD)
              </div>
              <p className="text-[10px] text-[#686C74]">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
