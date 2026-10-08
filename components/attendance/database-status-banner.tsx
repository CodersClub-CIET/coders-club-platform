"use client";

import React, { useEffect, useState } from "react";
import { attendanceService } from "@/lib/attendance/attendance-service";
import { ATTENDANCE_MIGRATION_SQL } from "@/lib/attendance/migration-sql";
import {
  AlertTriangle,
  Check,
  Copy,
  Database,
  ExternalLink,
  RefreshCw,
  X,
  Code2,
} from "lucide-react";

export default function DatabaseStatusBanner() {
  const [status, setStatus] = useState<{
    checked: boolean;
    loading: boolean;
    tablesExist: boolean;
    missingTables: string[];
    error?: string;
  }>({
    checked: false,
    loading: true,
    tablesExist: true,
    missingTables: [],
  });

  const [copied, setCopied] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkStatus = async () => {
    setStatus((prev) => ({ ...prev, loading: true }));
    try {
      const res = await attendanceService.checkDatabaseHealth();
      setStatus({
        checked: true,
        loading: false,
        tablesExist: res.tablesExist,
        missingTables: res.missingTables,
        error: res.error,
      });
    } catch {
      setStatus({
        checked: true,
        loading: false,
        tablesExist: false,
        missingTables: ["attendance_sessions", "attendance_records"],
        error: "Could not reach database",
      });
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ATTENDANCE_MIGRATION_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      alert("Please copy the SQL manually from the modal.");
    }
  };

  if (!status.checked || (status.tablesExist && !status.loading) || dismissed) {
    return null;
  }

  return (
    <>
      <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50/90 backdrop-blur p-4 sm:p-5 shadow-sm text-amber-950">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-200 text-amber-800 shrink-0 mt-0.5">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-amber-900">
                  Supabase Cloud Database Setup Required
                </h4>
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-200/80 text-amber-800 rounded-full">
                  Tables Missing
                </span>
              </div>
              <p className="text-xs text-amber-800/90 mt-1 leading-relaxed max-w-2xl">
                The database tables (
                <code className="font-mono font-semibold bg-amber-100 px-1 py-0.5 rounded">
                  attendance_sessions
                </code>
                ,{" "}
                <code className="font-mono font-semibold bg-amber-100 px-1 py-0.5 rounded">
                  attendance_records
                </code>
                ) do not exist in your Supabase project yet. Because of this, student submissions from mobile phones cannot sync to this website.
              </p>
              <p className="text-xs font-semibold text-amber-900 mt-2">
                Quick fix: Copy the SQL migration and run it once in your Supabase SQL Editor.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-start shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-white" />
                  <span>SQL Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Copy SQL Script</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowSqlModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-all"
            >
              <Code2 className="size-3.5" />
              <span>View SQL</span>
            </button>

            <a
              href="https://supabase.com/dashboard/project/acnhfntawflgkomksddp/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#111318] hover:bg-amber-100/60 text-amber-900 border border-amber-300 transition-all"
            >
              <ExternalLink className="size-3.5" />
              <span>SQL Editor</span>
            </a>

            <button
              type="button"
              onClick={checkStatus}
              disabled={status.loading}
              title="Re-check database connection"
              className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-200/60 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${status.loading ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => setDismissed(true)}
              title="Dismiss warning"
              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-200/60 transition-all"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SQL Migration Instructions Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111318] rounded-2xl shadow-2xl border border-[#292D33] max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#292D33] flex items-center justify-between bg-[#08090B]/70">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#FF2A1A]/10 text-[#FF2A1A]">
                  <Database className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#F3F1EC] text-sm">Supabase Database Setup</h3>
                  <p className="text-xs text-[#686C74] font-mono">Project: acnhfntawflgkomksddp</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="p-1.5 rounded-lg text-[#686C74] hover:text-[#9B9EA6] hover:bg-[#171A20] transition-all"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-[#FF2A1A]/10/70 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-950">
                <p className="font-bold mb-2">Instructions to enable cloud sync:</p>
                <ol className="list-decimal list-inside space-y-1 text-[#9B9EA6]">
                  <li>
                    Click the <strong>Copy SQL Script</strong> button below.
                  </li>
                  <li>
                    Open{" "}
                    <a
                      href="https://supabase.com/dashboard/project/acnhfntawflgkomksddp/sql/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FF2A1A] font-semibold underline"
                    >
                      Supabase SQL Editor
                    </a>{" "}
                    for your project.
                  </li>
                  <li>
                    Paste the SQL script into the editor and click <strong>Run</strong>.
                  </li>
                  <li>
                    Return here and click <strong>Test Connection</strong>. The warning will disappear and mobile scans will immediately sync in real time!
                  </li>
                </ol>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#9B9EA6]">Migration SQL Script</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF2A1A] hover:text-indigo-700"
                  >
                    {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                    <span>{copied ? "Copied!" : "Copy Full SQL"}</span>
                  </button>
                </div>
                <div className="bg-[#08090B] text-slate-200 rounded-xl p-4 font-mono text-[11px] max-h-64 overflow-y-auto border border-slate-800">
                  <pre>{ATTENDANCE_MIGRATION_SQL}</pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#292D33] bg-[#08090B] flex items-center justify-between">
              <button
                type="button"
                onClick={checkStatus}
                disabled={status.loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#111318] border border-[#292D33] hover:bg-[#171A20] text-[#9B9EA6] transition-all"
              >
                <RefreshCw className={`size-3.5 ${status.loading ? "animate-spin" : ""}`} />
                <span>Test Connection</span>
              </button>

              <div className="flex items-center gap-2">
                <a
                  href="https://supabase.com/dashboard/project/acnhfntawflgkomksddp/sql/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#FF2A1A]/10 border border-indigo-200 hover:bg-[#FF2A1A]/20 text-indigo-700 transition-all"
                >
                  <ExternalLink className="size-3.5" />
                  <span>Open Supabase SQL Editor</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#FF2A1A] hover:bg-[#C51D16] text-white shadow-sm transition-all"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  <span>{copied ? "Copied to Clipboard" : "Copy SQL Script"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
