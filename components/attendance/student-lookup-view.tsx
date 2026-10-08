"use client";

import React, { useEffect, useState } from "react";
import { StudentAttendanceSummary } from "@/lib/attendance/types";
import { attendanceService } from "@/lib/attendance/attendance-service";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  GraduationCap,
  Printer,
  QrCode,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";

export default function StudentLookupView() {
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<StudentAttendanceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentAttendanceSummary | null>(null);

  const performSearch = async (searchTerm: string) => {
    try {
      setLoading(true);
      const results = await attendanceService.searchStudentAttendance(searchTerm);
      setStudents(results);
      if (results.length > 0 && !selectedStudent) {
        setSelectedStudent(results[0]);
      } else if (results.length === 0) {
        setSelectedStudent(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performSearch(query);
  }, [query]);

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Search Bar Card */}
      <div className="bg-[#111318] rounded-2xl border border-[#292D33] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-[#F3F1EC] flex items-center gap-2">
              <UserCheck className="size-5 text-[#FF2A1A]" />
              Student Attendance Verification & OD Eligibility
            </h2>
            <p className="text-xs text-[#686C74] mt-0.5">
              Look up student participation records by Registration Number, Name, or Department
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="size-4 text-[#686C74] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Reg No (e.g. 9176...) or Name"
              className="w-full pl-9 pr-4 py-2 bg-[#08090B] border border-[#292D33] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
          </div>
        </div>

        <div className="text-xs text-[#686C74] flex items-center gap-2">
          <span className="font-semibold text-[#9B9EA6]">{students.length}</span> students found
        </div>
      </div>

      {students.length === 0 ? (
        <div className="bg-[#111318] rounded-2xl border border-[#292D33] p-12 text-center shadow-sm">
          <GraduationCap className="size-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#9B9EA6]">No student records found</h3>
          <p className="text-xs text-[#686C74] mt-1 max-w-sm mx-auto">
            Try searching for a different registration number or name, or ensure student scans have been recorded in an active session.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Student List (1 col) */}
          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {students.map((student) => {
              const isSelected = selectedStudent?.studentRegNo === student.studentRegNo;
              const isEligible = student.attendanceRate >= 75;

              return (
                <div
                  key={student.studentRegNo}
                  onClick={() => setSelectedStudent(student)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-indigo-500 bg-[#FF2A1A]/10/40 shadow-sm"
                      : "border-[#292D33] bg-[#111318] hover:border-indigo-200 hover:bg-[#08090B]/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#F3F1EC]">{student.studentName}</h4>
                      <div className="text-xs font-mono font-medium text-[#FF2A1A]">
                        {student.studentRegNo}
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isEligible
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {student.attendanceRate}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#686C74] pt-2 border-t border-[#292D33]">
                    <span>
                      {student.department} &bull; Year {student.year} - {student.section}
                    </span>
                    <span className="font-semibold text-[#9B9EA6]">
                      {student.sessionsAttended} / {student.totalSessions} sessions
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Detailed Verification Card (2 cols) */}
          {selectedStudent && (
            <div className="lg:col-span-2 bg-[#111318] rounded-2xl border border-[#292D33] p-6 shadow-sm flex flex-col justify-between print:border-none print:shadow-none print:p-0">
              <div className="space-y-6">
                {/* Print Header (Visible in print and preview) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#292D33]">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <GraduationCap className="size-5 text-[#FF2A1A]" />
                      <span className="text-[11px] font-bold text-[#686C74] uppercase tracking-wider">
                        Coimbatore Institute of Engineering and Technology
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-[#F3F1EC]">
                      Official Attendance Verification Slip
                    </h3>
                    <p className="text-xs text-[#686C74] mt-0.5">
                      Coders Club Institutional Event Records
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={handlePrintSlip}
                    className="bg-[#08090B] hover:bg-[#1D2026] text-white text-xs font-semibold py-2 px-3.5 rounded-xl gap-2 shadow-sm shrink-0 print:hidden"
                  >
                    <Printer className="size-3.5" />
                    Print Slip
                  </Button>
                </div>

                {/* Student Profile Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#08090B] p-4 rounded-xl border border-[#292D33]/80 text-xs">
                  <div>
                    <span className="text-[10px] text-[#686C74] font-semibold uppercase block">
                      Student Name
                    </span>
                    <span className="font-bold text-[#F3F1EC] text-sm">
                      {selectedStudent.studentName}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#686C74] font-semibold uppercase block">
                      Register Number
                    </span>
                    <span className="font-mono font-bold text-indigo-700 text-sm">
                      {selectedStudent.studentRegNo}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#686C74] font-semibold uppercase block">
                      Department / Year
                    </span>
                    <span className="font-semibold text-[#F3F1EC]">
                      {selectedStudent.department} (Year {selectedStudent.year})
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#686C74] font-semibold uppercase block">
                      Section / OD Status
                    </span>
                    <span
                      className={`font-bold inline-flex items-center gap-1 ${
                        selectedStudent.attendanceRate >= 75
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}
                    >
                      {selectedStudent.attendanceRate >= 75 ? (
                        <>
                          <CheckCircle2 className="size-3.5" /> OD Recommended
                        </>
                      ) : (
                        <>
                          <XCircle className="size-3.5" /> Below 75%
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Session Attendance Table */}
                <div>
                  <h4 className="text-xs font-bold text-[#9B9EA6] uppercase tracking-wider mb-3">
                    Session Check-in History ({selectedStudent.history.length} Sessions)
                  </h4>

                  <div className="border border-[#292D33] rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#08090B] border-b border-[#292D33] text-[#9B9EA6] font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Session & Event</th>
                          <th className="py-2.5 px-3">Period</th>
                          <th className="py-2.5 px-3">Method</th>
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedStudent.history.map((record, idx) => (
                          <tr key={idx} className="hover:bg-[#08090B]/70">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-[#F3F1EC]">{record.sessionName}</div>
                              <div className="text-[10px] text-[#686C74]">{record.eventName}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                                  record.period === "morning"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {record.period}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-[#9B9EA6]">
                              {record.verificationMethod === "qr_scan" ? "QR Scanned" : "Manual Entry"}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-[#686C74]">
                              {new Date(record.markedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                <CheckCircle2 className="size-3" />
                                {record.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Institutional Authorization Footer (for print) */}
                <div className="pt-6 border-t border-[#292D33] mt-6 grid grid-cols-2 gap-8 text-center text-xs text-[#9B9EA6]">
                  <div className="border-t border-dashed border-[#3A3E45] pt-3">
                    <span className="font-semibold block text-[#F3F1EC]">Faculty Coordinator</span>
                    <span className="text-[10px] text-[#686C74]">Coders Club, CIET</span>
                  </div>
                  <div className="border-t border-dashed border-[#3A3E45] pt-3">
                    <span className="font-semibold block text-[#F3F1EC]">Head of Department (HOD)</span>
                    <span className="text-[10px] text-[#686C74]">Verified & Approved for OD</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
