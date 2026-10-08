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
import { StatusIndicator, MetricCard } from "@/components/ui/cyberpunk";

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
        <MetricCard title="Total Associates" value={totalCount} />
        <MetricCard title="Active Associates" value={activeCount} />
        <MetricCard title="Inactive Associates" value={inactiveCount} />
      </div>

      {/* Role Notice & Contract Clarification */}
      <div className="bg-[#111318] border border-[#292D33] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#F3F1EC]">
        <div className="flex items-start sm:items-center gap-2.5">
          <Shield className="size-4 text-[#F2B84B] shrink-0 mt-0.5 sm:mt-0" />

          <div>
            <span className="font-bold">Access Level:</span>{" "}
            {isAdmin ? (
              <span className="text-[#32C979] font-mono">
                Administrator (Full Management Access)
              </span>
            ) : (
              <span className="text-[#9B9EA6] font-mono">
                Associate (Read-Only Access via Supabase RLS)
              </span>
            )}

            <p className="text-[#686C74] text-[11px] mt-0.5 font-mono">
              Allocation eligibility is bridged directly from active status.
              Authorization is strictly enforced at database boundary.
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded border border-[#292D33] text-[10px] font-mono uppercase tracking-wider text-[#9B9EA6] shrink-0">
          RLS Protected
        </span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-[#FF2A1A]/10 border border-[#FF2A1A]/30 rounded-xl p-4 flex items-center justify-between text-xs text-[#FF2A1A]">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() => loadAssociates()}
            className="font-mono underline hover:text-[#C51D16]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-[#111318] border border-[#292D33] rounded-xl overflow-hidden">
        {/* Controls Bar */}
        <div className="p-5 border-b border-[#292D33] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#F3F1EC]">
              Associates Directory
            </h2>

            <p className="text-xs text-[#686C74] mt-0.5 font-mono">
              Manage associate records, contact details, and allocation status.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="size-4 text-[#686C74] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, phone..."
                className="w-full sm:w-64 pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#292D33] bg-[#0D0F12] text-[#F3F1EC] outline-none focus:border-[#FF2A1A]/50 font-mono"
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
              className="py-1.5 px-3 text-xs rounded-lg border border-[#292D33] bg-[#0D0F12] text-[#F3F1EC] outline-none focus:border-[#FF2A1A]/50 font-mono"
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
            <button
              onClick={() => loadAssociates()}
              disabled={loading}
              title="Refresh directory"
              className="inline-flex items-center justify-center gap-1.5 border border-[#3A3E45] bg-[#1D2026] text-[#F3F1EC] hover:bg-[#292D33] rounded-lg px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3.5 ${loading ? "animate-spin" : ""}`}
              />

              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Add Associate (Admin Only) */}
            {isAdmin && (
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center justify-center gap-1.5 bg-[#FF2A1A] hover:bg-[#C51D16] text-white rounded-lg px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition"
              >
                <Plus className="size-3.5" />
                <span>Add Associate</span>
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-16 text-center text-[#9B9EA6] font-mono text-xs">
            Loading associates from database...
          </div>
        ) : filteredAssociates.length === 0 ? (
          /* Empty State */
          <div className="py-16 text-center px-4">
            <div className="size-14 rounded-2xl bg-[#0D0F12] border border-[#292D33] text-[#686C74] flex items-center justify-center mx-auto mb-3">
              <Users className="size-7" />
            </div>

            <h3 className="text-sm font-bold text-[#F3F1EC]">
              No associates found
            </h3>

            <p className="text-xs text-[#9B9EA6] font-mono max-w-sm mx-auto mt-1">
              {search || statusFilter !== "all"
                ? "No associate records match your current search and filter criteria."
                : "No associate records have been added to the platform database yet."}
            </p>

            <div className="mt-4 flex items-center justify-center gap-2">
              {search || statusFilter !== "all" ? (
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                  className="border border-[#3A3E45] bg-[#1D2026] text-[#F3F1EC] hover:bg-[#292D33] rounded-lg px-3 py-1.5 text-xs font-mono uppercase tracking-wider"
                >
                  Clear Filters
                </button>
              ) : isAdmin ? (
                <button
                  onClick={handleOpenCreate}
                  className="bg-[#FF2A1A] hover:bg-[#C51D16] text-white rounded-lg px-3 py-1.5 text-xs font-mono uppercase tracking-wider"
                >
                  <Plus className="size-3.5 inline mr-1.5" />
                  <span>Add First Associate</span>
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0D0F12] border-b border-[#292D33] text-[#9B9EA6] font-mono uppercase tracking-wider text-[10px]">
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

                <tbody className="divide-y divide-[#292D33]">
                  {filteredAssociates.map((associate) => (
                    <tr
                      key={associate.id}
                      className="hover:bg-[#1D2026] transition-colors"
                    >
                      {/* Name & ID */}
                      <td className="py-4 px-5">
                        <div className="font-bold text-[#F3F1EC] text-sm">
                          {associate.name}
                        </div>

                        <div className="text-[10px] text-[#686C74] font-mono mt-0.5">
                          ID: {associate.id.slice(0, 8)}...
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[#9B9EA6] font-mono">
                            <Mail className="size-3 text-[#686C74] shrink-0" />
                            <span>{associate.email || "—"}</span>
                          </div>

                          {associate.phone && (
                            <div className="flex items-center gap-1.5 text-[#9B9EA6] font-mono">
                              <Phone className="size-3 text-[#686C74] shrink-0" />
                              <span>{associate.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Auth Link Status */}
                      <td className="py-4 px-4">
                        {associate.authUserId ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#7FA7FF]/30 bg-[#7FA7FF]/10 text-[10px] font-mono text-[#7FA7FF] uppercase tracking-wider">
                            <CheckCircle2 className="size-3" />
                            <span>Linked Account</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#686C74]/30 bg-[#686C74]/10 text-[10px] font-mono text-[#9B9EA6] uppercase tracking-wider">
                            <span>Pending Link</span>
                          </span>
                        )}
                      </td>

                      {/* Active Status */}
                      <td className="py-4 px-4">
                        <StatusIndicator status={associate.isActive ? "active" : "offline"} />
                      </td>

                      {/* Allocation Eligibility */}
                      <td className="py-4 px-4">
                        {associate.isActive ? (
                          <span className="text-[11px] font-mono text-[#32C979] flex items-center gap-1">
                            <CheckCircle2 className="size-3 text-[#32C979]" />
                            <span>Eligible for Events</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-[#686C74]">
                            Not eligible (inactive)
                          </span>
                        )}
                      </td>

                      {/* Admin Actions */}
                      {isAdmin && (
                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(associate)}
                              title="Edit associate details"
                              className="border border-[#3A3E45] text-[#9B9EA6] hover:bg-[#1D2026] hover:text-[#F3F1EC] rounded px-2 py-1 text-xs font-mono flex items-center gap-1"
                            >
                              <Edit2 className="size-3" />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => handleToggleActive(associate)}
                              title={
                                associate.isActive
                                  ? "Deactivate associate"
                                  : "Activate associate"
                              }
                              className={
                                associate.isActive
                                  ? "border border-[#FF2A1A]/40 text-[#FF2A1A] hover:bg-[#FF2A1A]/10 rounded px-2 py-1 text-xs font-mono"
                                  : "border border-[#32C979]/40 text-[#32C979] hover:bg-[#32C979]/10 rounded px-2 py-1 text-xs font-mono"
                              }
                            >
                              {associate.isActive
                                ? "Deactivate"
                                : "Activate"}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-[#292D33]">
              {filteredAssociates.map((associate) => (
                <div key={associate.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-[#F3F1EC] text-sm">
                        {associate.name}
                      </h4>

                      <p className="text-[10px] text-[#686C74] font-mono">
                        ID: {associate.id.slice(0, 8)}...
                      </p>
                    </div>

                    <div className="shrink-0">
                      <StatusIndicator status={associate.isActive ? "active" : "offline"} />
                    </div>
                  </div>

                  <div className="space-y-1 text-xs font-mono text-[#9B9EA6]">
                    <div className="flex items-center gap-1.5">
                      <Mail className="size-3 text-[#686C74]" />
                      <span>{associate.email || "No email"}</span>
                    </div>

                    {associate.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="size-3 text-[#686C74]" />
                        <span>{associate.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#292D33] text-[11px] font-mono">
                    <span className="text-[#686C74]">
                      {associate.authUserId
                        ? "Account linked"
                        : "Pending account link"}
                    </span>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(associate)}
                          className="border border-[#3A3E45] text-[#9B9EA6] hover:bg-[#1D2026] hover:text-[#F3F1EC] rounded px-2 py-1 text-xs font-mono flex items-center gap-1"
                        >
                          <Edit2 className="size-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleToggleActive(associate)}
                          className={
                            associate.isActive
                              ? "border border-[#FF2A1A]/40 text-[#FF2A1A] hover:bg-[#FF2A1A]/10 rounded px-2 py-1 text-xs font-mono"
                              : "border border-[#32C979]/40 text-[#32C979] hover:bg-[#32C979]/10 rounded px-2 py-1 text-xs font-mono"
                          }
                        >
                          {associate.isActive
                            ? "Deactivate"
                            : "Activate"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Summary */}
            <div className="p-4 border-t border-[#292D33] bg-[#0D0F12] flex items-center justify-between text-xs font-mono text-[#686C74]">
              <span>
                Showing {filteredAssociates.length} of {associates.length}{" "}
                associates
              </span>

              <span className="text-[10px]">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#08090B]/80 backdrop-blur-sm p-4"
        >
          <div className="bg-[#111318] border border-[#292D33] rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in-0 zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#292D33] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#F3F1EC] text-base">
                  {modalMode === "create"
                    ? "Add New Associate"
                    : "Edit Associate"}
                </h3>

                <p className="text-xs font-mono text-[#686C74] mt-0.5">
                  {modalMode === "create"
                    ? "Create an associate record adhering to database schema."
                    : `Editing record for ${selectedAssociate?.name}.`}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="text-[#686C74] hover:text-[#F3F1EC] p-1 rounded-lg hover:bg-[#1D2026]"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-5 space-y-4">
              {formErrors.length > 0 && (
                <div className="bg-[#FF2A1A]/10 border border-[#FF2A1A]/30 rounded-xl p-3 text-xs text-[#FF2A1A] space-y-1 font-mono">
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
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#9B9EA6] block">
                  Associate Name <span className="text-[#FF2A1A]">*</span>
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
                  className="w-full bg-[#0D0F12] border border-[#292D33] text-[#F3F1EC] rounded-lg px-3 py-2 text-xs focus:border-[#FF2A1A]/50 focus:outline-none font-mono"
                />
              </div>

              {/* Email field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#9B9EA6] block">
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
                  className="w-full bg-[#0D0F12] border border-[#292D33] text-[#F3F1EC] rounded-lg px-3 py-2 text-xs focus:border-[#FF2A1A]/50 focus:outline-none font-mono"
                />
              </div>

              {/* Phone field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#9B9EA6] block">
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
                  className="w-full bg-[#0D0F12] border border-[#292D33] text-[#F3F1EC] rounded-lg px-3 py-2 text-xs focus:border-[#FF2A1A]/50 focus:outline-none font-mono"
                />
              </div>

              {/* Active status checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#F3F1EC]">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isActive: e.target.checked,
                      }))
                    }
                    className="rounded border-[#292D33] bg-[#0D0F12] accent-[#FF2A1A]"
                  />

                  <span>
                    Active Associate (Eligible for event allocation)
                  </span>
                </label>
              </div>

              {/* Notice */}
              <p className="text-[10px] font-mono text-[#686C74] leading-relaxed pt-1">
                Note: Operates strictly within the live{" "}
                <code className="text-[#9B9EA6]">public.associates</code>{" "}
                database schema. Inserts and updates are authorized by
                Supabase RLS.
              </p>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-[#292D33] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={saving}
                  className="bg-[#1D2026] border border-[#3A3E45] text-[#F3F1EC] rounded-lg px-3.5 py-2 text-xs font-mono uppercase tracking-wider hover:bg-[#292D33] transition disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#FF2A1A] hover:bg-[#C51D16] text-white rounded-lg px-4 py-2 text-xs font-mono uppercase tracking-wider transition disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : modalMode === "create"
                      ? "Create Associate"
                      : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}