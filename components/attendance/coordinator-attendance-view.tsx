"use client";

import React, { useEffect, useState } from "react";
import {
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  COORDINATOR_ROLES,
  CoordinatorAttendanceInput,
  DEPARTMENTS,
} from "@/lib/attendance/types";
import { attendanceService } from "@/lib/attendance/attendance-service";
import QRDisplayModal from "@/components/attendance/qr-display-modal";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  GraduationCap,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";

export default function CoordinatorAttendanceView() {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrModalSession, setQrModalSession] = useState<AttendanceSession | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleOpenCoordinatorQR = () => {
    let target = sessions.find((s) => s.id === selectedSessionId);
    if (!target) {
      target = sessions.find((s) => s.isActive) || sessions[0];
    }
    if (!target) {
      alert("No attendance sessions found. Please create or start a session first.");
      return;
    }
    setQrModalSession(target);
    setShowQRModal(true);
  };

  // New coordinator form state
  const [formData, setFormData] = useState<{
    sessionId: string;
    coordinatorId: string;
    coordinatorName: string;
    department: string;
    role: string;
  }>({
    sessionId: "",
    coordinatorId: "",
    coordinatorName: "",
    department: "CSE",
    role: "Event Coordinator",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionsData, coordinatorsData] = await Promise.all([
        attendanceService.getSessions(),
        attendanceService.getCoordinatorRecords(
          selectedSessionId === "all" ? undefined : selectedSessionId
        ),
      ]);
      setSessions(sessionsData);
      setRecords(coordinatorsData);
      if (sessionsData.length > 0 && !formData.sessionId) {
        const active = sessionsData.find((s) => s.isActive) || sessionsData[0];
        setFormData((prev) => ({ ...prev, sessionId: active.id }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSessionId]);

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      await attendanceService.downloadCoordinatorAttendanceCSV(
        selectedSessionId === "all" ? undefined : selectedSessionId
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to export coordinator attendance.");
    } finally {
      setExporting(false);
    }
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.sessionId) {
      setFormError("Please select an attendance session.");
      return;
    }

    if (!formData.coordinatorId.trim()) {
      setFormError("Coordinator ID or Roll Number is required.");
      return;
    }

    if (!formData.coordinatorName.trim()) {
      setFormError("Coordinator name is required.");
      return;
    }

    try {
      setSubmitting(true);
      const newRec = await attendanceService.markCoordinatorAttendance({
        sessionId: formData.sessionId,
        coordinatorId: formData.coordinatorId,
        coordinatorName: formData.coordinatorName,
        department: formData.department,
        role: formData.role,
        markedBy: `${formData.role} (Coordinator Desk)`,
      });

      setRecords((prev) => [newRec, ...prev]);
      setShowCheckInModal(false);
      setFormData((prev) => ({
        ...prev,
        coordinatorId: "",
        coordinatorName: "",
      }));
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to check in coordinator.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (recordId: string, status: AttendanceStatus) => {
    try {
      const updated = await attendanceService.updateRecordStatus(recordId, status);
      setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update coordinator status.");
    }
  };

  const handleDeleteRecord = async (recordId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove coordinator attendance for "${name}"?`)) {
      return;
    }
    try {
      await attendanceService.deleteRecord(recordId);
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove coordinator attendance.");
    }
  };

  // Filter records by search
  const filteredRecords = records.filter((r) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = (r.associateName || r.studentName || "").toLowerCase().includes(q);
    const idMatch = (r.associateUserId || "").toLowerCase().includes(q);
    const roleMatch = (r.markedBy || "").toLowerCase().includes(q);
    const deptMatch = (r.studentDepartment || "").toLowerCase().includes(q);
    return nameMatch || idMatch || roleMatch || deptMatch;
  });

  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  // Metrics
  const distinctCoordinators = new Set(records.map((r) => r.associateUserId).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="size-4 text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              Executive & Organizing Staff
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">Event Coordinator Attendance</h2>
          <p className="text-xs text-indigo-200 mt-0.5">
            Dedicated check-in roster and duplicate-checked attendance for CIET Coders Club leads and volunteers
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenCoordinatorQR}
            disabled={sessions.length === 0}
            className="bg-purple-950/80 hover:bg-purple-900/90 border-purple-500/50 text-purple-200 hover:text-white text-xs font-semibold py-2 px-3.5 rounded-xl gap-2 shadow-sm transition-all"
          >
            <QrCode className="size-3.5 text-purple-300" />
            Coordinator QR
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleExportCSV}
            disabled={exporting || records.length === 0}
            className="bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-white text-xs font-semibold py-2 px-3.5 rounded-xl gap-2 shadow-sm transition-all"
          >
            <Download className="size-3.5" />
            {exporting ? "Exporting..." : "Coordinator CSV"}
          </Button>

          <Button
            type="button"
            onClick={() => setShowCheckInModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-4 rounded-xl gap-2 shadow-md transition-all"
          >
            <Plus className="size-3.5" />
            Check-in Coordinator
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <UserCheck className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Coordinator Scans
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{records.length}</div>
            <div className="text-xs text-slate-400">Total check-in events recorded</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
            <Briefcase className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Distinct Coordinators
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{distinctCoordinators}</div>
            <div className="text-xs text-slate-400">Unique leads & team members</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Duplicate Protection
            </div>
            <div className="text-2xl font-extrabold text-emerald-700">Active</div>
            <div className="text-xs text-slate-400">Database + Local verification</div>
          </div>
        </div>
      </div>

      {/* Filters Bar: Session Dropdown + Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Session:</span>
          </div>

          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 transition-all"
          >
            <option value="all">All Sessions ({sessions.length})</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.sessionName} ({s.period}) {s.isActive ? "• Active" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search coordinator name, ID, or role..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600 transition-all"
          />
        </div>
      </div>

      {/* Coordinator Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="size-6 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading coordinator attendance records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="size-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No Coordinator Records Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Check in coordinators using the &quot;Check-in Coordinator&quot; button or have them scan the session QR code using Associate mode.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Coordinator</th>
                  <th className="py-3 px-4">Role & Department</th>
                  <th className="py-3 px-4">Session & Event</th>
                  <th className="py-3 px-4">Check-in Time</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r) => {
                  const s = sessionMap.get(r.sessionId);
                  const name = r.associateName || r.studentName || "N/A";
                  const coordId = r.associateUserId || "N/A";
                  const role = r.markedBy?.replace(" (Self Scan)", "").replace(" (Coordinator Desk)", "") || "Executive";

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{name}</div>
                        <div className="text-[11px] font-mono text-indigo-600">{coordId}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800">
                          {role}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Dept: {r.studentDepartment || "Executive"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{s?.sessionName || "Session"}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{s?.period || "N/A"} Period</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {new Date(r.markedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] text-slate-600 font-medium">
                          {r.verificationMethod === "qr_scan" ? "QR Scanned" : "Coordinator Desk"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={r.status}
                          onChange={(e) =>
                            handleStatusChange(r.id, e.target.value as AttendanceStatus)
                          }
                          className={`text-[11px] font-semibold rounded-lg px-2 py-1 border transition-colors ${
                            r.status === "present"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : r.status === "late"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          <option value="present">Present</option>
                          <option value="late">Late</option>
                          <option value="excused">Excused</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(r.id, name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove coordinator attendance"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Check-in Coordinator Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="size-5 text-indigo-400" />
                <h3 className="text-sm font-bold">Check-in Event Coordinator</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckInModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCheckInSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Attendance Session <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.sessionId}
                  onChange={(e) => setFormData({ ...formData, sessionId: e.target.value })}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-600"
                >
                  <option value="">Select an active session</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.sessionName} ({s.period}) {s.isActive ? "• Active" : "• Closed"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Coordinator Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gowtham R"
                  value={formData.coordinatorName}
                  onChange={(e) => setFormData({ ...formData, coordinatorName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Coordinator ID / Reg No <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CIET-CORD-01 or 917621104001"
                  value={formData.coordinatorId}
                  onChange={(e) => setFormData({ ...formData, coordinatorId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-600 uppercase"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Enforces database duplicate verification across session
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-600"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Club Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-600"
                  >
                    {COORDINATOR_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCheckInModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  {submitting ? "Checking In..." : "Confirm Check-in"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coordinator QR Display Modal */}
      {showQRModal && qrModalSession && (
        <QRDisplayModal
          session={qrModalSession}
          initialAttendeeType="associate"
          onClose={() => {
            setShowQRModal(false);
            setQrModalSession(null);
          }}
        />
      )}
    </div>
  );
}
