"use client";

import React, { useEffect, useState } from "react";
import { EventReference, EventScoreRecord } from "@/app/types/score";
import { validateScore, calculatePercentage } from "@/app/lib/score-validation";
import { useAuth } from "@/lib/auth/use-auth";
import {
  fetchEventScores,
  SEED_EVENTS,
  subscribeToRealtimeScores,
  unsubscribeRealtimeScores,
  updateEventScoreInSupabase,
} from "@/app/lib/score-service";
import type { RealtimeChannel } from "@supabase/supabase-js";

export default function ScoreManagementTable() {
  const { user, isAuthenticated } = useAuth();
  const [events] = useState<EventReference[]>(SEED_EVENTS);
  const [records, setRecords] = useState<EventScoreRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEventId, setSelectedEventId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Edit State map: recordId -> input string value
  const [editInputs, setEditInputs] = useState<Record<string, string>>({});
  // Feedback Messages map: recordId -> { type: 'success' | 'error', text: string }
  const [feedback, setFeedback] = useState<
    Record<string, { type: "success" | "error"; text: string }>
  >({});

  // 1. Initial Data Fetching from Supabase / Fallback
  useEffect(() => {
    let isMounted = true;

    async function loadScores() {
      setLoading(true);
      const res = await fetchEventScores();
      if (isMounted) {
        setRecords(res.data);
        setLoading(false);
      }
    }

    loadScores();

    // 2. Realtime Subscription Setup
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

  // Filter records based on selected event and search query
  const filteredRecords = records.filter((rec) => {
    const matchesEvent =
      selectedEventId === "ALL" || rec.eventId === selectedEventId;
    const matchesSearch =
      rec.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.studentRegNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.department.toLowerCase().includes(searchQuery.toLowerCase());
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

    // Dynamic maxScore validation check
    const validation = validateScore(numVal, record.maxScore);

    if (!validation.isValid) {
      setFeedback((prev) => ({
        ...prev,
        [record.id]: {
          type: "error",
          text: validation.errors.join(" "),
        },
      }));
      return;
    }

    // Evaluator Audit Identity
    const evaluatorId = user?.id || record.enteredBy || "auth-user";
    const evaluatorName =
      user?.email ||
      (user?.user_metadata?.full_name as string) ||
      record.enteredByName ||
      "Evaluator";

    // Optimistic UI Update
    const { updatedAt } = await updateEventScoreInSupabase(
      record.id,
      numVal,
      evaluatorId,
      evaluatorName
    );

    setRecords((prevRecords) =>
      prevRecords.map((r) =>
        r.id === record.id
          ? {
              ...r,
              score: numVal,
              enteredBy: evaluatorId,
              enteredByName: evaluatorName,
              updatedAt,
            }
          : r
      )
    );

    // Clear input field and set success feedback
    setEditInputs((prev) => {
      const next = { ...prev };
      delete next[record.id];
      return next;
    });

    setFeedback((prev) => ({
      ...prev,
      [record.id]: {
        type: "success",
        text: `Score updated to ${numVal}/${record.maxScore}!`,
      },
    }));

    // Auto-dismiss success notification after 3 seconds
    setTimeout(() => {
      setFeedback((prev) => {
        const next = { ...prev };
        if (next[record.id]?.type === "success") {
          delete next[record.id];
        }
        return next;
      });
    }, 3000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header & Controls Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Score Management & Entry
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              View student event scores, validate entries, and update marks in real time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Total Records: {filteredRecords.length}
            </span>
            {isAuthenticated ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Evaluator: {user?.email || "Authenticated"}
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Session: Evaluator Mode
              </span>
            )}
          </div>
        </div>

        {/* Filters & Search Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Filter by Event
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Events ({events.length})</option>
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name} (Max Score: {evt.maxScore})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Search Student / Reg No
            </label>
            <input
              type="text"
              placeholder="Search by name, reg no, or dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Student Info</th>
                <th className="py-3 px-4">Dept / Class</th>
                <th className="py-3 px-4">Event Name</th>
                <th className="py-3 px-4 text-center">Score & Performance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Score Entry / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12 text-slate-500 font-medium"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading score records from Supabase database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-slate-400 font-medium"
                  >
                    No score records match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const percentage = calculatePercentage(
                    record.score,
                    record.maxScore
                  );
                  const currentInput = editInputs[record.id] ?? "";
                  const recordFeedback = feedback[record.id];

                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Student Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {record.studentName}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {record.studentRegNo}
                        </div>
                      </td>

                      {/* Dept & Class */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {record.department}
                        </div>
                        <div className="text-xs text-slate-500">
                          Yr {record.year} - Sec {record.section}
                        </div>
                      </td>

                      {/* Event Name */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-medium text-slate-800 truncate">
                          {record.eventName}
                        </div>
                        <div className="text-xs text-slate-400">
                          Entered by {record.enteredByName}
                        </div>
                      </td>

                      {/* Score & Performance */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="text-base font-bold text-slate-900">
                          {record.score}{" "}
                          <span className="text-xs font-normal text-slate-500">
                            / {record.maxScore}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-indigo-600">
                          {percentage}%
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {percentage >= 75 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            Excellent
                          </span>
                        ) : percentage >= 50 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Good
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Needs Imp.
                          </span>
                        )}
                      </td>

                      {/* Score Entry / Update Action */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              placeholder={`0 - ${record.maxScore}`}
                              value={currentInput}
                              onChange={(e) =>
                                handleInputChange(record.id, e.target.value)
                              }
                              className="w-24 px-2 py-1 text-sm border border-slate-300 rounded-md text-right focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateScore(record)}
                              className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-md transition-colors shadow-sm disabled:opacity-50"
                              disabled={currentInput.trim() === ""}
                            >
                              Update
                            </button>
                          </div>

                          {/* Inline Feedback message */}
                          {recordFeedback && (
                            <div
                              className={`text-xs mt-1 font-medium ${
                                recordFeedback.type === "error"
                                  ? "text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200"
                                  : "text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
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
