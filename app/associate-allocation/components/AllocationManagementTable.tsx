"use client";

import { useEffect, useMemo, useState } from "react";
import { allocationService } from "@/lib/allocation/service";
import type {
  AssociateAllocation,
  AllocationStatus,
} from "@/lib/allocation/types";

export default function AllocationManagementTable() {
  const [allocations, setAllocations] = useState<AssociateAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | AllocationStatus>(
    "all"
  );
  const [search, setSearch] = useState("");

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await allocationService.getAllocations();
      setAllocations(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load allocations from Supabase.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    allocationService
      .getAllocations()
      .then((data) => {
        if (!ignore) {
          setAllocations(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to load allocations from Supabase.";
          setError(message);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const filteredAllocations = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    return allocations.filter((allocation) => {
      const matchesStatus =
        statusFilter === "all" || allocation.status === statusFilter;

      const matchesSearch =
        !searchValue ||
        allocation.associateId.toLowerCase().includes(searchValue) ||
        allocation.eventId.toLowerCase().includes(searchValue) ||
        (allocation.eventNodeId &&
          allocation.eventNodeId.toLowerCase().includes(searchValue)) ||
        (allocation.associateName &&
          allocation.associateName.toLowerCase().includes(searchValue)) ||
        (allocation.eventName &&
          allocation.eventName.toLowerCase().includes(searchValue)) ||
        (allocation.subEventId &&
          allocation.subEventId.toLowerCase().includes(searchValue));

      return matchesStatus && matchesSearch;
    });
  }, [allocations, search, statusFilter]);

  const statusClasses: Record<AllocationStatus, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    active: "bg-green-100 text-green-700",
    completed: "bg-slate-100 text-slate-700",
    suspended: "bg-red-100 text-red-700",
  };

  return (
    <section className="rounded-2xl border bg-white shadow-sm">
      <div className="border-b p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Allocation Management
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              View and manage associate event allocations stored in Supabase.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search associate or event..."
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "all" | AllocationStatus
                )
              }
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="suspended">Suspended</option>
            </select>

            <button
              type="button"
              onClick={handleRefresh}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-5 my-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Unable to load allocations</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading allocations from Supabase...
          </div>
        ) : filteredAllocations.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No allocations found.
          </div>
        ) : (
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Associate</th>
                <th className="px-5 py-3">Event Node</th>
                <th className="px-5 py-3">Sub-event</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Attendance</th>
                <th className="px-5 py-3">Allocated At</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {filteredAllocations.map((allocation) => (
                <tr
                  key={allocation.id}
                  className="hover:bg-slate-50 transition"
                >
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {allocation.associateName || allocation.associateId}
                  </td>

                  <td className="px-5 py-4 text-slate-600 font-mono text-xs">
                    {allocation.eventName || allocation.eventId}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {allocation.subEventName || allocation.subEventId || "—"}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        statusClasses[allocation.status]
                      }`}
                    >
                      {allocation.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    {allocation.attendanceAccess ? (
                      <span className="inline-flex items-center gap-1 font-medium text-green-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Enabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-slate-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        Disabled
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-slate-500">
                    {new Date(allocation.allocatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border-t px-5 py-3 text-xs text-slate-500">
        Showing {filteredAllocations.length} of {allocations.length} allocations
      </div>
    </section>
  );
}
