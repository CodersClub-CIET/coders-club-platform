"use client";

import { useEffect, useMemo, useState } from "react";
import { allocationService } from "@/lib/allocation/service";
import type {
  AssociateAllocation,
  AllocationStatus,
} from "@/lib/allocation/types";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  X,
  UserCheck,
  Calendar,
  AlertCircle,
} from "lucide-react";

export default function AllocationManagementTable() {
  const [allocations, setAllocations] = useState<AssociateAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | AllocationStatus>("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [associatesList, setAssociatesList] = useState<{ id: string; name: string; email: string }[]>([]);
  const [eventsList, setEventsList] = useState<{ id: string; name: string; parent_id: string | null }[]>([]);
  const [selectedAssociate, setSelectedAssociate] = useState("");
  const [selectedEventNode, setSelectedEventNode] = useState("");
  const [grantAttendance, setGrantAttendance] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await allocationService.getAllocations();
      setAllocations(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load allocations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void handleRefresh();
  }, []);

  async function openCreateModal() {
    setModalOpen(true);
    setModalError("");
    try {
      const supabase = createClient();
      const [{ data: aData }, { data: eData }] = await Promise.all([
        supabase.from("associates").select("id, name, email").eq("is_active", true).order("name"),
        supabase.from("event_nodes").select("id, name, parent_id").eq("is_active", true).order("name"),
      ]);
      setAssociatesList(aData || []);
      setEventsList(eData || []);
      if (aData && aData.length > 0) setSelectedAssociate(aData[0].id);
      if (eData && eData.length > 0) setSelectedEventNode(eData[0].id);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to load options.");
    }
  }

  async function handleCreateAllocation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAssociate || !selectedEventNode) {
      setModalError("Please select both an associate and an event.");
      return;
    }
    setSubmitting(true);
    setModalError("");

    try {
      await allocationService.createAllocation({
        associateId: selectedAssociate,
        eventNodeId: selectedEventNode,
        attendanceAccess: grantAttendance,
        isActive: true,
      });
      setModalOpen(false);
      await handleRefresh();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to create allocation.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleAttendanceAccess(allocation: AssociateAllocation) {
    setBusyId(allocation.id);
    try {
      await allocationService.updateAllocation(allocation.id, {
        attendanceAccess: !allocation.attendanceAccess,
      });
      await handleRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update attendance access.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(allocation: AssociateAllocation) {
    if (!window.confirm(`Remove allocation for ${allocation.associateName || "this Associate"}?`)) return;
    setBusyId(allocation.id);
    try {
      await allocationService.deleteAllocation(allocation.id);
      await handleRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove allocation.");
    } finally {
      setBusyId(null);
    }
  }

  const filteredAllocations = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allocations.filter((a) => {
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      const matchesSearch =
        !q ||
        a.associateName?.toLowerCase().includes(q) ||
        a.eventName?.toLowerCase().includes(q) ||
        a.associateEmail?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [allocations, search, statusFilter]);

  return (
    <section className="border border-[#292D33] bg-[#111318] rounded-xl overflow-hidden">
      {/* Header controls */}
      <div className="border-b border-[#292D33] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#9B9EA6]">
              Operational Assignment
            </span>
            <h2 className="text-xl font-semibold text-[#F3F1EC]">
              Associate Event Allocations
            </h2>
            <p className="mt-0.5 text-xs text-[#686C74]">
              Assign approved associates to specific events/sub-events and grant attendance scanning authority.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-3.5 text-[#686C74]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search associate or event..."
                className="w-full bg-[#0D0F12] border border-[#292D33] text-[#F3F1EC] rounded-lg pl-8 pr-3 py-1.5 text-xs focus:border-[#FF2A1A]/50 focus:outline-none font-mono"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | AllocationStatus)}
              className="bg-[#0D0F12] border border-[#292D33] text-[#F3F1EC] rounded-lg px-3 py-1.5 text-xs focus:border-[#FF2A1A]/50 focus:outline-none font-mono"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="suspended">Suspended</option>
            </select>

            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 bg-[#1D2026] border border-[#3A3E45] text-[#F3F1EC] rounded-lg px-3 py-1.5 text-xs font-mono uppercase tracking-wider hover:bg-[#292D33] transition"
            >
              <RefreshCw className="size-3.5" />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 bg-[#FF2A1A] text-white rounded-lg px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider hover:bg-[#C51D16] transition"
            >
              <Plus className="size-3.5" />
              <span>Allocate Associate</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="m-5 flex items-start gap-2.5 border border-[#FF2A1A]/30 bg-[#FF2A1A]/10 p-3 text-xs text-[#FF2A1A] rounded">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-[#9B9EA6]">
            Loading allocations from Supabase...
          </div>
        ) : filteredAllocations.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck className="mx-auto size-8 text-[#686C74] mb-2" />
            <p className="text-sm font-semibold text-[#F3F1EC]">No Allocations Found</p>
            <p className="text-xs text-[#9B9EA6] mt-1 font-mono">
              Click &quot;Allocate Associate&quot; above to assign an associate to an event.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="border-b border-[#292D33] bg-[#0D0F12] text-[10px] font-mono uppercase tracking-wider text-[#9B9EA6]">
              <tr>
                <th className="px-5 py-3">Associate</th>
                <th className="px-5 py-3">Assigned Event Node</th>
                <th className="px-5 py-3">Attendance Access</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Allocated Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#292D33] bg-[#111318]">
              {filteredAllocations.map((a) => (
                <tr key={a.id} className="hover:bg-[#1D2026] transition">
                  <td className="px-5 py-3.5 font-medium text-[#F3F1EC]">
                    <div className="font-semibold text-sm">{a.associateName || "Unknown Associate"}</div>
                    <div className="text-[11px] text-[#9B9EA6] font-mono">{a.associateEmail}</div>
                  </td>

                  <td className="px-5 py-3.5 text-[#F3F1EC]">
                    <div className="font-medium">{a.eventName || a.eventNodeId}</div>
                  </td>

                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => void toggleAttendanceAccess(a)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono uppercase tracking-wider rounded border transition ${
                        a.attendanceAccess
                          ? "border-[#32C979]/30 bg-[#32C979]/10 text-[#32C979] hover:bg-[#32C979]/20"
                          : "border-[#686C74]/30 bg-[#686C74]/10 text-[#686C74] hover:bg-[#686C74]/20"
                      }`}
                      title="Click to toggle Attendance Access"
                    >
                      {a.attendanceAccess ? (
                        <>
                          <ShieldCheck className="size-3.5 text-[#32C979]" />
                          <span>Access Granted (ON)</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="size-3.5 text-[#686C74]" />
                          <span>Disabled (OFF)</span>
                        </>
                      )}
                    </button>
                  </td>

                  <td className="px-5 py-3.5">
                    <span className="rounded bg-[#1D2026] px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-[#9B9EA6] border border-[#3A3E45]">
                      {a.status}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 text-[#9B9EA6] font-mono">
                    {new Date(a.allocatedAt).toLocaleDateString()}
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => void handleDelete(a)}
                      className="p-1.5 text-[#FF2A1A] hover:bg-[#FF2A1A]/10 rounded transition"
                      title="Remove allocation"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border-t border-[#292D33] px-5 py-3 text-[11px] font-mono text-[#686C74]">
        Showing {filteredAllocations.length} of {allocations.length} allocations
      </div>

      {/* Allocation Creation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#08090B]/80 p-4">
          <div className="w-full max-w-md border border-[#292D33] bg-[#111318] rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between border-b border-[#292D33] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#9B9EA6]">
                  New Allocation
                </span>
                <h3 className="text-lg font-semibold text-[#F3F1EC]">
                  Assign Associate to Event
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[#686C74] hover:text-[#F3F1EC]"
              >
                <X className="size-5" />
              </button>
            </div>

            {modalError && (
              <div role="alert" className="border border-[#FF2A1A]/30 bg-[#FF2A1A]/10 p-2.5 text-xs text-[#FF2A1A] rounded">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateAllocation} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#9B9EA6]">
                  Select Associate
                </label>
                <select
                  required
                  value={selectedAssociate}
                  onChange={(e) => setSelectedAssociate(e.target.value)}
                  className="w-full bg-[#0D0F12] border border-[#292D33] text-[#F3F1EC] rounded-lg px-3 py-2 text-xs focus:border-[#FF2A1A]/50 focus:outline-none font-mono"
                >
                  {associatesList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#9B9EA6]">
                  Select Event or Sub-Event
                </label>
                <select
                  required
                  value={selectedEventNode}
                  onChange={(e) => setSelectedEventNode(e.target.value)}
                  className="w-full bg-[#0D0F12] border border-[#292D33] text-[#F3F1EC] rounded-lg px-3 py-2 text-xs focus:border-[#FF2A1A]/50 focus:outline-none font-mono"
                >
                  {eventsList.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.parent_id ? `↳ Sub: ${ev.name}` : `Event: ${ev.name}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="grantAttendance"
                  checked={grantAttendance}
                  onChange={(e) => setGrantAttendance(e.target.checked)}
                  className="size-4 accent-[#FF2A1A]"
                />
                <label htmlFor="grantAttendance" className="text-xs font-medium text-[#F3F1EC] cursor-pointer">
                  Grant Attendance Access (Associate can start sessions & scan QR)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#292D33]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-[#1D2026] border border-[#3A3E45] text-[#F3F1EC] rounded-lg px-3.5 py-2 text-xs font-mono uppercase tracking-wider hover:bg-[#292D33] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#FF2A1A] hover:bg-[#C51D16] text-white rounded-lg px-4 py-2 text-xs font-mono uppercase tracking-wider transition disabled:opacity-60"
                >
                  {submitting ? "Allocating..." : "Confirm Allocation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
