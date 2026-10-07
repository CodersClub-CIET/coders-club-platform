"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  UserCheck,
  Users,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { useAuth } from "@/lib/auth/use-auth";
import {
  associateService,
  AssociateServiceError,
} from "@/lib/associates/service";
import type {
  Associate,
  CreateAssociateInput,
  UpdateAssociateInput,
} from "@/lib/associates/types";
import { useAssociatesRealtime } from "@/lib/associates/use-associates-realtime";

type ModalMode = "create" | "edit" | null;

interface FormState {
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
}

const initialFormState: FormState = {
  name: "",
  email: "",
  phone: "",
  isActive: true,
};

export default function AssociateManagementTable() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [associates, setAssociates] = useState<Associate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Modal State
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedAssociate, setSelectedAssociate] =
    useState<Associate | null>(null);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Load associates
  const loadAssociates = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);

    try {
      const data = await associateService.listAssociates();
      setAssociates(data);
    } catch (err) {
      const message =
        err instanceof AssociateServiceError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to load associates from database.";

      setError(message);

      if (!isSilent) {
        toast.error(message);
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  // Initial load
  useEffect(() => {
    loadAssociates();
  }, []);

  // Realtime live updates
  useAssociatesRealtime({
    onAnyChange: () => {
      loadAssociates(true);
    },
  });

  // Filtered associates
  const filteredAssociates = useMemo(() => {
    const q = search.toLowerCase().trim();

    return associates.filter((a) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && a.isActive) ||
        (statusFilter === "inactive" && !a.isActive);

      const matchesSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        (a.email && a.email.toLowerCase().includes(q)) ||
        (a.phone && a.phone.includes(q)) ||
        a.id.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [associates, search, statusFilter]);

  // Metric counts
  const totalCount = associates.length;
  const activeCount = associates.filter((a) => a.isActive).length;
  const inactiveCount = totalCount - activeCount;

  // Open Create Modal
  const handleOpenCreate = () => {
    setSelectedAssociate(null);
    setFormData(initialFormState);
    setFormErrors([]);
    setModalMode("create");
  };

  // Open Edit Modal
  const handleOpenEdit = (associate: Associate) => {
    setSelectedAssociate(associate);

    setFormData({
      name: associate.name,
      email: associate.email ?? "",
      phone: associate.phone ?? "",
      isActive: associate.isActive,
    });

    setFormErrors([]);
    setModalMode("edit");
  };

  // Close Modal
  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedAssociate(null);
    setFormData(initialFormState);
    setFormErrors([]);
    setSaving(false);
  };

  // Save Associate (Create or Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    setFormErrors([]);
    setSaving(true);

    try {
      if (modalMode === "create") {
        const payload: CreateAssociateInput = {
          name: formData.name,
          email: formData.email.trim() ? formData.email.trim() : null,
          phone: formData.phone.trim() ? formData.phone.trim() : null,
          isActive: formData.isActive,
        };

        const created = await associateService.createAssociate(payload);

        setAssociates((prev) => [created, ...prev]);

        toast.success(
          `Associate '${created.name}' created successfully.`,
        );

        handleCloseModal();
      } else if (modalMode === "edit" && selectedAssociate) {
        const payload: UpdateAssociateInput = {
          name: formData.name,
          email: formData.email.trim() ? formData.email.trim() : null,
          phone: formData.phone.trim() ? formData.phone.trim() : null,
          isActive: formData.isActive,
        };

        const updated = await associateService.updateAssociate(
          selectedAssociate.id,
          payload,
        );

        setAssociates((prev) =>
          prev.map((item) =>
            item.id === updated.id ? updated : item,
          ),
        );

        toast.success(
          `Associate '${updated.name}' updated successfully.`,
        );

        handleCloseModal();
      }
    } catch (err) {
      const message =
        err instanceof AssociateServiceError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to save associate.";

      setFormErrors([message]);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (associate: Associate) => {
    const newStatus = !associate.isActive;
    const actionLabel = newStatus ? "activate" : "deactivate";

    try {
      const updated = await associateService.setAssociateActiveStatus(
        associate.id,
        newStatus,
      );

      setAssociates((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a)),
      );

      toast.success(
        `Associate '${associate.name}' is now ${
          newStatus ? "Active" : "Inactive"
        }.`,
      );
    } catch (err) {
      const message =
        err instanceof AssociateServiceError
          ? err.message
          : err instanceof Error
            ? err.message
            : `Failed to ${actionLabel} associate.`;

      toast.error(message);
    }
  };

  return (
    <section className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Associates
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {totalCount}
            </p>
          </div>

          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="size-6" />
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Associates
            </p>

            <p className="text-2xl font-black text-emerald-600 mt-1">
              {activeCount}
            </p>
          </div>

          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck className="size-6" />
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Inactive Associates
            </p>

            <p className="text-2xl font-black text-slate-400 mt-1">
              {inactiveCount}
            </p>
          </div>

          <div className="p-3 bg-slate-100 text-slate-500 rounded-xl">
            <UserX className="size-6" />
          </div>
        </div>
      </div>

      {/* Role Notice & Contract Clarification */}
      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-indigo-900">
        <div className="flex items-start sm:items-center gap-2.5">
          <Shield className="size-4 text-indigo-600 shrink-0 mt-0.5 sm:mt-0" />

          <div>
            <span className="font-bold">Access Level:</span>{" "}
            {isAdmin ? (
              <span className="text-emerald-700 font-semibold">
                Administrator (Full Management Access)
              </span>
            ) : (
              <span className="text-slate-700 font-semibold">
                Associate (Read-Only Access via Supabase RLS)
              </span>
            )}

            <p className="text-indigo-700/90 text-[11px] mt-0.5">
              Allocation eligibility is bridged directly from active status.
              Authorization is strictly enforced at database boundary.
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white border border-indigo-200 text-indigo-700 shrink-0">
          RLS Protected
        </span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() => loadAssociates()}
            className="font-semibold underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        {/* Controls Bar */}
        <div className="p-5 border-b flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Associates Directory
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Manage associate records, contact details, and allocation status.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, phone..."
                className="w-full sm:w-64 pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "all" | "active" | "inactive",
                )
              }
              className="py-1.5 px-3 text-xs rounded-xl border border-slate-300 bg-white outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
            >
              <option value="all">All Status ({totalCount})</option>
              <option value="active">
                Active Only ({activeCount})
              </option>
              <option value="inactive">
                Inactive Only ({inactiveCount})
              </option>
            </select>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAssociates()}
              disabled={loading}
              title="Refresh directory"
            >
              <RefreshCw
                className={`size-3.5 ${loading ? "animate-spin" : ""}`}
              />

              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {/* Add Associate (Admin Only) */}
            {isAdmin && (
              <Button
                variant="default"
                size="sm"
                onClick={handleOpenCreate}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
              >
                <Plus className="size-3.5" />
                <span>Add Associate</span>
              </Button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-16">
            <Loading label="Loading associates from database..." />
          </div>
        ) : filteredAssociates.length === 0 ? (
          /* Empty State */
          <div className="py-16 text-center px-4">
            <div className="size-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Users className="size-7" />
            </div>

            <h3 className="text-sm font-bold text-slate-800">
              No associates found
            </h3>

            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {search || statusFilter !== "all"
                ? "No associate records match your current search and filter criteria."
                : "No associate records have been added to the platform database yet."}
            </p>

            <div className="mt-4 flex items-center justify-center gap-2">
              {search || statusFilter !== "all" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              ) : isAdmin ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleOpenCreate}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <Plus className="size-3.5" />
                  <span>Add First Associate</span>
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-5">Associate</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Auth Account</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Allocation Access</th>
                    {isAdmin && (
                      <th className="py-3 px-5 text-right">Actions</th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredAssociates.map((associate) => (
                    <tr
                      key={associate.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Name & ID */}
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 text-sm">
                          {associate.name}
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {associate.id.slice(0, 8)}...
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Mail className="size-3 text-slate-400 shrink-0" />
                            <span>{associate.email || "—"}</span>
                          </div>

                          {associate.phone && (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Phone className="size-3 text-slate-400 shrink-0" />
                              <span>{associate.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Auth Link Status */}
                      <td className="py-4 px-4">
                        {associate.authUserId ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <CheckCircle2 className="size-3" />
                            <span>Linked Account</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                            <span>Pending Link</span>
                          </span>
                        )}
                      </td>

                      {/* Active Status */}
                      <td className="py-4 px-4">
                        {associate.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>

                      {/* Allocation Eligibility */}
                      <td className="py-4 px-4">
                        {associate.isActive ? (
                          <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="size-3 text-emerald-600" />
                            <span>Eligible for Events</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            Not eligible (inactive)
                          </span>
                        )}
                      </td>

                      {/* Admin Actions */}
                      {isAdmin && (
                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => handleOpenEdit(associate)}
                              title="Edit associate details"
                            >
                              <Edit2 className="size-3" />
                              <span>Edit</span>
                            </Button>

                            <Button
                              variant={
                                associate.isActive ? "ghost" : "secondary"
                              }
                              size="xs"
                              onClick={() => handleToggleActive(associate)}
                              className={
                                associate.isActive
                                  ? "text-slate-600 hover:text-red-700 hover:bg-red-50"
                                  : "text-emerald-700 hover:bg-emerald-50"
                              }
                              title={
                                associate.isActive
                                  ? "Deactivate associate"
                                  : "Activate associate"
                              }
                            >
                              {associate.isActive
                                ? "Deactivate"
                                : "Activate"}
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredAssociates.map((associate) => (
                <div key={associate.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {associate.name}
                      </h4>

                      <p className="text-[10px] text-slate-400 font-mono">
                        ID: {associate.id.slice(0, 8)}...
                      </p>
                    </div>

                    <div className="shrink-0">
                      {associate.isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Mail className="size-3 text-slate-400" />
                      <span>{associate.email || "No email"}</span>
                    </div>

                    {associate.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="size-3 text-slate-400" />
                        <span>{associate.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t text-[11px]">
                    <span className="text-slate-500">
                      {associate.authUserId
                        ? "Account linked"
                        : "Pending account link"}
                    </span>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleOpenEdit(associate)}
                        >
                          <Edit2 className="size-3" />
                          <span>Edit</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleToggleActive(associate)}
                          className={
                            associate.isActive
                              ? "text-red-600"
                              : "text-emerald-600"
                          }
                        >
                          {associate.isActive
                            ? "Deactivate"
                            : "Activate"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Summary */}
            <div className="p-4 border-t bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {filteredAssociates.length} of {associates.length}{" "}
                associates
              </span>

              <span className="text-[11px] text-slate-400">
                Database: public.associates
              </span>
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Modal (Admin Only) */}
      {modalMode && isAdmin && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
        >
          <div className="bg-white border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in-0 zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {modalMode === "create"
                    ? "Add New Associate"
                    : "Edit Associate"}
                </h3>

                <p className="text-xs text-slate-500 mt-0.5">
                  {modalMode === "create"
                    ? "Create an associate record adhering to database schema."
                    : `Editing record for ${selectedAssociate?.name}.`}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-5 space-y-4">
              {formErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 space-y-1">
                  {formErrors.map((err, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <AlertCircle className="size-3.5 shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Name field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Associate Name <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="e.g. Kavya Murugan"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              {/* Email field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Email Address
                </label>

                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="e.g. kavya@codersclub.edu"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              {/* Phone field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Contact Phone
                </label>

                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              {/* Active status checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isActive: e.target.checked,
                      }))
                    }
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />

                  <span>
                    Active Associate (Eligible for event allocation)
                  </span>
                </label>
              </div>

              {/* Notice */}
              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                Note: Operates strictly within the live{" "}
                <code className="text-slate-600">public.associates</code>{" "}
                database schema. Inserts and updates are authorized by
                Supabase RLS.
              </p>

              {/* Modal Buttons */}
              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseModal}
                  disabled={saving}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  {saving
                    ? "Saving..."
                    : modalMode === "create"
                      ? "Create Associate"
                      : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}