"use client";

import { useEffect, useState, useMemo } from "react";
import {
  listAssociateAccessRequests,
  type AssociateAccessRequest,
} from "@/lib/associates/access-requests";
import {
  Check,
  Copy,
  KeyRound,
  RotateCw,
  Search,
  ShieldAlert,
  X,
  UserCheck,
  Clock,
  AlertCircle,
} from "lucide-react";
import { PageHeader, StatusIndicator } from "@/components/ui/cyberpunk";

type FilterTab = "all" | "pending" | "awaiting_activation" | "activated" | "rejected";

export default function AssociateRequestsPage() {
  const [requests, setRequests] = useState<AssociateAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state for revealing one-time activation credential
  const [credentialModal, setCredentialModal] = useState<{
    isOpen: boolean;
    fullName: string;
    email: string;
    credential: string;
    expiresAt: string;
    isReissue?: boolean;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRequests(await listAssociateAccessRequests());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleApprove(request: AssociateAccessRequest) {
    if (!window.confirm(`Approve Associate Access for ${request.full_name}?`)) return;
    setBusy(request.id);
    setError("");

    try {
      const res = await fetch(`/api/admin/associate-requests/${request.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Approval failed.");
      }

      // Show one-time credential modal
      setCredentialModal({
        isOpen: true,
        fullName: request.full_name,
        email: request.email,
        credential: data.activationCredential,
        expiresAt: data.expiresAt,
        isReissue: false,
      });

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve request.");
    } finally {
      setBusy(null);
    }
  }

  async function handleReissue(request: AssociateAccessRequest) {
    if (!window.confirm(`Generate and reissue a new activation credential for ${request.full_name}? Any existing credential will be invalidated.`)) {
      return;
    }
    setBusy(request.id);
    setError("");

    try {
      const res = await fetch(`/api/admin/associate-requests/${request.id}/reissue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Reissue failed.");
      }

      setCredentialModal({
        isOpen: true,
        fullName: request.full_name,
        email: request.email,
        credential: data.activationCredential,
        expiresAt: data.expiresAt,
        isReissue: true,
      });

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reissue credential.");
    } finally {
      setBusy(null);
    }
  }

  async function handleReject(request: AssociateAccessRequest) {
    const reason = window.prompt("Reason for rejecting this request:");
    if (reason === null) return; // User cancelled prompt

    setBusy(request.id);
    setError("");

    try {
      const res = await fetch(`/api/admin/associate-requests/${request.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Rejection failed.");
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject request.");
    } finally {
      setBusy(null);
    }
  }

  function copyCredentialToClipboard() {
    if (!credentialModal?.credential) return;
    void navigator.clipboard.writeText(credentialModal.credential);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // Derive request lifecycle state
  function getComputedStatus(r: AssociateAccessRequest): "pending" | "awaiting_activation" | "activated" | "rejected" {
    if (r.status === "approved") {
      return r.approved_auth_user_id ? "activated" : "awaiting_activation";
    }
    if (r.status === "rejected") return "rejected";
    return "pending";
  }

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const computed = getComputedStatus(r);
      if (activeTab !== "all" && computed !== activeTab) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = r.full_name.toLowerCase().includes(query);
        const matchesEmail = r.email.toLowerCase().includes(query);
        const matchesDept = r.department?.toLowerCase().includes(query);
        return matchesName || matchesEmail || matchesDept;
      }
      return true;
    });
  }, [requests, activeTab, searchQuery]);

  const counts = useMemo(() => {
    const res = { all: requests.length, pending: 0, awaiting_activation: 0, activated: 0, rejected: 0 };
    requests.forEach((r) => {
      const status = getComputedStatus(r);
      res[status]++;
    });
    return res;
  }, [requests]);

  const mapStatusToIndicator = (status: string) => {
    switch (status) {
      case "pending": return "pending";
      case "activated": return "active";
      case "awaiting_activation": return "processing";
      case "rejected": return "revoked";
      default: return "pending";
    }
  };

  return (
    <main className="space-y-6">
      <PageHeader
        moduleCode="ADM // 06"
        category="ACCESS CONTROL"
        title="Associate Requests"
        description="Review and manage associate access requests."
        icon={UserCheck}
      />

      {error && (
        <div role="alert" className="flex items-start gap-2.5 border border-[#FF2A1A]/30 bg-[#FF2A1A]/10 p-4 text-sm text-[#FF2A1A] rounded">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs and Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1 border-b border-[#292D33] sm:border-none pb-2 sm:pb-0">
          {(
            [
              ["pending", "Pending", counts.pending],
              ["awaiting_activation", "Awaiting Activation", counts.awaiting_activation],
              ["activated", "Activated", counts.activated],
              ["rejected", "Rejected", counts.rejected],
              ["all", "All Requests", counts.all],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-mono uppercase tracking-wider transition rounded ${
                activeTab === key
                  ? "bg-[#292D33] text-[#F3F1EC]"
                  : "bg-transparent text-[#9B9EA6] hover:bg-[#1D2026] hover:text-[#F3F1EC]"
              }`}
            >
              <span>{label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  activeTab === key ? "bg-[#111318] text-[#F3F1EC]" : "bg-[#111318] text-[#9B9EA6]"
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 size-4 text-[#686C74]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email..."
            className="w-full border border-[#292D33] bg-[#0D0F12] text-[#F3F1EC] rounded-lg pl-9 pr-3 py-2 text-xs outline-none focus:border-[#FF2A1A]/50 font-mono"
          />
        </div>
      </div>

      {/* Requests List */}
      <section className="border border-[#292D33] bg-[#111318] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm font-mono text-[#9B9EA6]">
            Loading access requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="mx-auto size-8 text-[#686C74] mb-2" />
            <p className="text-sm font-medium text-[#F3F1EC]">No access requests found</p>
            <p className="text-xs text-[#9B9EA6] mt-1 font-mono">
              {searchQuery ? "Try a different search term" : `No requests in the "${activeTab}" status.`}
            </p>
          </div>
        ) : (
          <div className="border-b border-[#292D33] divide-y divide-[#292D33]">
            {filteredRequests.map((request) => {
              const status = getComputedStatus(request);

              return (
                <article key={request.id} className="group relative p-6 hover:bg-[#0D0F12] transition-colors">
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#FF2A1A] opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-display text-xl font-light text-[#F3F1EC] tracking-tight">
                          {request.full_name.toUpperCase()}
                        </h3>
                        <StatusIndicator status={mapStatusToIndicator(status)} />
                      </div>

                      <p className="font-mono text-xs text-[#9B9EA6]">
                        {[request.department, request.year && `YEAR ${request.year}`, request.section && `SEC ${request.section}`]
                          .filter(Boolean)
                          .join(" · ") || "GENERAL"}
                      </p>

                      <p className="font-mono text-[11px] text-[#686C74]">
                        {request.email} {request.phone ? `· ${request.phone}` : ""} &bull; REQ: {new Date(request.created_at).toLocaleDateString()}
                      </p>

                      {request.reason && (
                        <p className="text-xs text-[#9B9EA6] font-normal leading-relaxed pt-1">
                          <span className="text-[#686C74] font-mono uppercase text-[10px] mr-1">Note:</span>
                          {request.reason}
                        </p>
                      )}

                      {request.rejection_reason && (
                        <p className="text-xs text-[#FF2A1A] bg-[#FF2A1A]/10 p-2.5 border border-[#FF2A1A]/30 rounded">
                          <strong>Rejection note:</strong> {request.rejection_reason}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      {status === "pending" && (
                        <>
                          <button
                            type="button"
                            disabled={busy === request.id}
                            onClick={() => void handleApprove(request)}
                            className="bg-[#32C979]/10 text-[#32C979] border border-[#32C979]/30 hover:bg-[#32C979]/20 px-4 py-2 rounded text-xs font-mono uppercase tracking-wider disabled:opacity-60 transition"
                          >
                            {busy === request.id ? "Processing..." : "Approve Associate"}
                          </button>
                          <button
                            type="button"
                            disabled={busy === request.id}
                            onClick={() => void handleReject(request)}
                            className="bg-[#FF2A1A]/10 text-[#FF2A1A] border border-[#FF2A1A]/30 hover:bg-[#FF2A1A]/20 px-4 py-2 rounded text-xs font-mono uppercase tracking-wider disabled:opacity-60 transition"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {status === "awaiting_activation" && (
                        <button
                          type="button"
                          disabled={busy === request.id}
                          onClick={() => void handleReissue(request)}
                          className="inline-flex items-center gap-1.5 border border-[#7FA7FF]/30 bg-[#7FA7FF]/10 text-[#7FA7FF] hover:bg-[#7FA7FF]/20 px-4 py-2 rounded text-xs font-mono uppercase tracking-wider disabled:opacity-60 transition"
                        >
                          <RotateCw className="size-3.5" />
                          <span>Reissue Activation Credential</span>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* One-Time Credential Modal */}
      {credentialModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#08090B]/80 p-4">
          <div className="w-full max-w-lg border border-[#292D33] bg-[#111318] rounded-xl p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between border-b border-[#292D33] pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#9B9EA6]">
                  {credentialModal.isReissue ? "Credential Reissued" : "Associate Approved"}
                </span>
                <h3 className="text-xl font-semibold text-[#F3F1EC]">
                  One-Time Activation Credential
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCredentialModal(null)}
                className="text-[#686C74] hover:text-[#F3F1EC] p-1"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2.5 bg-[#F2B84B]/10 border border-[#F2B84B]/30 p-3 text-xs text-[#F2B84B] rounded">
                <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                <p>
                  <strong>Important Security Notice:</strong> This activation credential will only be shown <strong>ONCE</strong>. Copy and transmit it securely to <strong>{credentialModal.fullName}</strong> ({credentialModal.email}). The plain code is never stored in the database.
                </p>
              </div>

              <div>
                <p className="text-xs font-mono text-[#9B9EA6] mb-1">
                  Credential Code (64 characters):
                </p>
                <div className="flex items-center gap-2">
                  <textarea
                    readOnly
                    rows={2}
                    value={credentialModal.credential}
                    className="w-full font-mono text-xs border border-[#292D33] bg-[#0D0F12] text-[#F3F1EC] rounded-lg p-2.5 outline-none select-all break-all"
                  />
                  <button
                    type="button"
                    onClick={copyCredentialToClipboard}
                    className="flex flex-col items-center justify-center gap-1 border border-[#3A3E45] bg-[#1D2026] text-[#F3F1EC] rounded-lg px-3.5 py-3 text-xs font-mono uppercase tracking-wider hover:bg-[#292D33] transition shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="size-4 text-[#32C979]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-4 text-[#9B9EA6]" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-[#9B9EA6] space-y-1 bg-[#0D0F12] border border-[#292D33] p-3 rounded">
                <p>
                  <strong>Activation URL for Associate:</strong>
                </p>
                <code className="text-[#7FA7FF] block font-mono text-[11px] break-all">
                  {typeof window !== "undefined" ? `${window.location.origin}/associate-activate` : "/associate-activate"}
                </code>
                <p className="pt-1">
                  Expires in 72 hours ({new Date(credentialModal.expiresAt).toLocaleString()}).
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#292D33]">
              <button
                type="button"
                onClick={() => setCredentialModal(null)}
                className="bg-[#1D2026] border border-[#3A3E45] text-[#F3F1EC] rounded-lg px-4 py-2.5 text-xs font-mono uppercase tracking-wider hover:bg-[#292D33] transition"
              >
                Done / I Have Saved the Credential
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
