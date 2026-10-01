"use client";

import React, { useState } from "react";
import { AttendanceRecord, AttendanceSession, ManualAttendanceInput } from "@/lib/attendance/types";
import { attendanceService } from "@/lib/attendance/attendance-service";
import { validateRegistrationNumber } from "@/lib/attendance/validation";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  UserPlus,
  X,
} from "lucide-react";

interface ManualEntryModalProps {
  session: AttendanceSession;
  onClose: () => void;
  onRecordCreated: (record: AttendanceRecord) => void;
}

export default function ManualEntryModal({
  session,
  onClose,
  onRecordCreated,
}: ManualEntryModalProps) {
  const [formData, setFormData] = useState<{
    studentRegNo: string;
    studentName: string;
    department: string;
    year: number;
    section: string;
    reason: string;
  }>({
    studentRegNo: "",
    studentName: "",
    department: "CSE",
    year: 3,
    section: "A",
    reason: "Device / Network Failure",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!validateRegistrationNumber(formData.studentRegNo)) {
      setError("Please enter a valid Registration Number (8-12 digits).");
      return;
    }

    if (!formData.studentName.trim()) {
      setError("Student full name is required.");
      return;
    }

    try {
      setLoading(true);
      const payload: ManualAttendanceInput = {
        sessionId: session.id,
        studentRegNo: formData.studentRegNo.trim(),
        studentName: formData.studentName.trim(),
        department: formData.department,
        year: Number(formData.year),
        section: formData.section.toUpperCase(),
        reason: formData.reason,
        markedBy: "Coordinator (Manual Entry)",
      };

      const record = await attendanceService.markManualAttendance(payload);
      onRecordCreated(record);

      setSuccessMsg(
        `Successfully marked attendance for ${record.studentName} (${record.studentRegNo}).`
      );

      // Reset regNo and name so coordinator can immediately enter the next student
      setFormData((prev) => ({
        ...prev,
        studentRegNo: "",
        studentName: "",
      }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record manual attendance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <UserPlus className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Manual Attendance Entry</h2>
              <p className="text-xs text-slate-500">Record attendance for students unable to scan</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target Session Banner */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span>{session.sessionName}</span>
              <span className="capitalize text-indigo-600">{session.period} Period</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{session.eventName}</div>
          </div>

          {/* Error Feedback */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Feedback */}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Student Reg No */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Registration Number
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 917621104001"
              value={formData.studentRegNo}
              onChange={(e) => setFormData({ ...formData, studentRegNo: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Student Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Student Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Aarav Kumar"
              value={formData.studentName}
              onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Dept, Year, Sec */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dept</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
              >
                <option value="CSE">CSE</option>
                <option value="IT">IT</option>
                <option value="AI&DS">AI & DS</option>
                <option value="AI&ML">AI & ML</option>
                <option value="Cyber Security">Cyber Security</option>
                <option value="ECE">ECE</option>
                <option value="EEE">EEE</option>
                <option value="MECH">MECH</option>
                <option value="CIVIL">CIVIL</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Year</label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sec</label>
              <select
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>
          </div>

          {/* Reason for Manual Entry */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Audit Note
            </label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
            >
              <option value="Device / Network Failure">Device battery dead / No network</option>
              <option value="Camera Scanner Malfunction">Camera / scanner failed to read QR</option>
              <option value="OD Verification">Official OD duty attendance</option>
              <option value="Special Permission">Coordinator special override</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Done
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {loading ? "Recording..." : "Record Attendance"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
