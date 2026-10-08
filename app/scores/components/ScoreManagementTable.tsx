"use client";

import React, { useEffect, useState } from "react";
import { EventReference, EventScoreRecord } from "@/app/types/score";
import { validateScore, calculatePercentage } from "@/app/lib/score-validation";
import { useAuth } from "@/lib/auth/use-auth";
import {
  fetchEventScores,
  fetchEventReferences,
  subscribeToRealtimeScores,
  unsubscribeRealtimeScores,
  updateEventScoreInSupabase,
} from "@/app/lib/score-service";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { BarChart3, RefreshCw, Search } from "lucide-react";

export default function ScoreManagementTable() {
  const { user, isAuthenticated } = useAuth();
  const [events, setEvents] = useState<EventReference[]>([]);
  const [records, setRecords] = useState<EventScoreRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>("");
  const [selectedEventId, setSelectedEventId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Edit State map: recordId → input string value
  const [editInputs, setEditInputs] = useState<Record<string, string>>({});
  // Feedback Messages map: recordId → { type: 'success' | 'error', text: string }
  const [feedback, setFeedback] = useState<
    Record<string, { type: "success" | "error"; text: string }>
  >({});

  async function loadScores() {
    setLoading(true);
    setLoadError("");
    try {
      const [res, eventList] = await Promise.all([
        fetchEventScores(),
        fetchEventReferences(),
      ]);
      setRecords(res.data);
      setEvents(eventList);
      setLoadError(res.error || "");
    } catch (error) {
      console.error("Score management load failed:", error);
      setRecords([]);
      setEvents([]);
      setLoadError("Unable to load scores and events. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const [res, eventList] = await Promise.all([
          fetchEventScores(),
          fetchEventReferences(),
        ]);
        if (!isMounted) return;
        setRecords(res.data);
        setEvents(eventList);
        setLoadError(res.error || "");
      } catch (error) {
        console.error("Score management load failed:", error);
        if (!isMounted) return;
        setRecords([]);
        setEvents([]);
        setLoadError("Unable to load scores and events. Please try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    const channel: RealtimeChannel | null = subscribeToRealtimeScores(
      (updatedRecord) => {
        if (!isMounted) return;
        setRecords((prev) => {
          const index = prev.findIndex((r) => r.id === updatedRecord.id);
          if (index !== -1) {
            const next = [...prev];
            next[index] = updatedRecord;
            return next;
          }
          return [updatedRecord, ...prev];
        });
      }
    );

    return () => {
      isMounted = false;
      unsubscribeRealtimeScores(channel);
    };
  }, []);

  const filteredRecords = records.filter((rec) => {
    const matchesEvent =
      selectedEventId === "ALL" || rec.eventId === selectedEventId;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      rec.studentName.toLowerCase().includes(q) ||
      rec.studentRegNo.toLowerCase().includes(q) ||
      rec.department.toLowerCase().includes(q);
    return matchesEvent && matchesSearch;
  });

  const handleInputChange = (recordId: string, val: string) => {
    setEditInputs((prev) => ({ ...prev, [recordId]: val }));
    if (feedback[recordId]) {
      setFeedback((prev) => {
        const next = { ...prev };
        delete next[recordId];
        return next;
      });
    }
  };

  const handleUpdateScore = async (record: EventScoreRecord) => {
    const rawVal = editInputs[record.id];
    const numVal = Number(rawVal);
    const validation = validateScore(numVal, record.maxScore);

    if (!validation.isValid) {
      setFeedback((prev) => ({
        ...prev,
        [record.id]: { type: "error", text: validation.errors.join(" ") },
      }));
      return;
    }

    const scoredBy = user?.id || undefined;

    const result = await updateEventScoreInSupabase(record.id, numVal, scoredBy);

    if (!result.success) {
      setFeedback((prev) => ({
        ...prev,
        [record.id]: { type: "error", text: result.error || "Unable to update score." },
      }));
      return;
    }

    setRecords((prev) =>
      prev.map((r) =>
        r.id === record.id
          ? { ...r, score: numVal, enteredBy: scoredBy ?? r.enteredBy, updatedAt: result.updatedAt }
          : r
      )
    );

    setEditInputs((prev) => {
      const next = { ...prev };
      delete next[record.id];
      return next;
    });

    setFeedback((prev) => ({
      ...prev,
      [record.id]: { type: "success", text: `Score updated to ${numVal}/${record.maxScore}` },
    }));

    setTimeout(() => {
      setFeedback((prev) => {
        const next = { ...prev };
        if (next[record.id]?.type === "success") delete next[record.id];
        return next;
      });
    }, 3000);
  };

  const totalStudents = records.length;
  const avgScore = records.length > 0 
    ? (records.reduce((acc, r) => acc + (r.score || 0), 0) / records.length).toFixed(1)
    : "—";
  const topScore = records.length > 0
    ? Math.max(...records.map((r) => r.score || 0))
    : "—";

  return (
    <div className="space-y-8">
      {/* Large Typographic Numeric Strip */}
      <div className="border-y border-[#292D33] py-8 grid grid-cols-1 sm:grid-cols-3 gap-8 divide-y sm:divide-y-0 sm:divide-x divide-[#292D33]">
        <div className="space-y-1">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9B9EA6]">
            01 // EVALUATED STUDENTS
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-numeric-huge text-[#F3F1EC]">{String(totalStudents).padStart(2, "0")}</span>
          </div>
          <p className="font-mono text-xs text-[#686C74]">Total participation records in roster</p>
        </div>

        <div className="space-y-1 sm:pl-8 pt-4 sm:pt-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9B9EA6]">
            02 // AVERAGE SCORE
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-numeric-huge text-[#F3F1EC]">{avgScore}</span>
          </div>
          <p className="font-mono text-xs text-[#686C74]">Mean marks across evaluated rounds</p>
        </div>

        <div className="space-y-1 sm:pl-8 pt-4 sm:pt-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9B9EA6]">
            03 // TOP SCORE
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-numeric-huge text-[#F2B84B]">{topScore}</span>
          </div>
          <p className="font-mono text-xs text-[#686C74]">Peak verified performance mark</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-[#0D0F12] border border-[#292D33] rounded p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-display font-light text-[#F3F1EC]">Score Entry &amp; Audit</h2>
            <p className="text-xs text-[#9B9EA6] font-mono mt-0.5">
              Live score recording synchronized with relational academic records.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-mono bg-[#111318] text-[#9B9EA6] border border-[#292D33]">
              {filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""}
            </span>
            {isAuthenticated && (
              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-mono bg-[#32C979]/10 text-[#32C979] border border-[#32C979]/30">
                {user?.email}
              </span>
            )}
            <button
              type="button"
              onClick={() => void loadScores()}
              title="Refresh scores"
              className="p-2 rounded border border-[#292D33] hover:bg-[#171A20] text-[#9B9EA6] hover:text-[#F3F1EC] transition-colors"
            >
              <RefreshCw className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#292D33]">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#9B9EA6] mb-1.5">
              Filter by Event
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full rounded border border-[#292D33] bg-[#08090B] px-3 py-2 text-sm text-[#F3F1EC] focus:border-[#FF2A1A]/50 focus:outline-none"
            >
              <option value="ALL">All events ({events.length})</option>
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6e513b] mb-1.5">
              Search by student name or reg no
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#a99684]" />
              <input
                type="text"
                placeholder="Name, register number, department…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[#292D33] pl-9 pr-3 py-2 text-sm text-[#211b17] placeholder:text-[#a99684] focus:border-[#9a7351] focus:outline-none focus:ring-1 focus:ring-[#9a7351]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {loadError && (
        <div role="alert" className="border border-red-200 bg-[#fff5f2] px-4 py-3 text-sm text-red-800 rounded-lg">
          {loadError}
        </div>
      )}

      {/* Table */}
      <div className="bg-[#111318] border border-[#292D33] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[#f4efe8] border-b border-[#292D33] text-[10px] font-bold uppercase tracking-[0.12em] text-[#6e513b]">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Department / Year</th>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4 text-center">Score</th>
                <th className="py-3 px-4 text-center">Grade</th>
                <th className="py-3 px-4 text-right">Update Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0e8df] text-[#211b17]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-[#76695e]">
                      <div className="size-6 border-2 border-[#9a7351] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Loading score records…</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-[#76695e]">
                      <BarChart3 className="size-8 text-[#9B9EA6]" />
                      <p className="text-sm font-semibold text-[#3c3028]">No score records found</p>
                      <p className="text-sm max-w-xs">
                        Scores appear here once Associates enter them for assigned events. Try adjusting the filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const percentage = calculatePercentage(record.score, record.maxScore);
                  const currentInput = editInputs[record.id] ?? "";
                  const recordFeedback = feedback[record.id];

                  return (
                    <tr key={record.id} className="hover:bg-[#faf7f3] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#211b17]">{record.studentName || "—"}</div>
                        <div className="text-xs text-[#76695e] font-mono">{record.studentRegNo || "—"}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-[#211b17]">{record.department || "—"}</div>
                        <div className="text-xs text-[#76695e]">
                          {record.year ? `Year ${record.year}` : ""}
                          {record.year && record.section ? " · " : ""}
                          {record.section ? `Sec ${record.section}` : ""}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="font-medium text-[#211b17] truncate">{record.eventName || "—"}</div>
                        <div className="text-xs text-[#76695e]">
                          By {record.enteredByName || "—"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="text-base font-bold text-[#211b17]">
                          {record.score}
                          <span className="text-xs font-normal text-[#76695e]"> / {record.maxScore}</span>
                        </div>
                        <div className="text-xs font-semibold text-[#9a7351]">{percentage}%</div>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {percentage >= 75 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Excellent
                          </span>
                        ) : percentage >= 50 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
                            Good
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            Needs Improvement
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              placeholder={`0–${record.maxScore}`}
                              value={currentInput}
                              onChange={(e) => handleInputChange(record.id, e.target.value)}
                              className="w-20 px-2 py-1.5 text-sm border border-[#292D33] rounded-md text-right focus:border-[#9a7351] focus:outline-none focus:ring-1 focus:ring-[#9a7351]"
                            />
                            <button
                              type="button"
                              onClick={() => void handleUpdateScore(record)}
                              disabled={currentInput.trim() === ""}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#FF2A1A] hover:bg-[#C51D16] rounded-md transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Save
                            </button>
                          </div>
                          {recordFeedback && (
                            <div
                              className={`text-xs font-medium px-2 py-0.5 rounded ${
                                recordFeedback.type === "error"
                                  ? "text-red-700 bg-red-50 border border-red-200"
                                  : "text-emerald-700 bg-emerald-50 border border-emerald-200"
                              }`}
                            >
                              {recordFeedback.text}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
