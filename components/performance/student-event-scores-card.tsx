"use client";

import React from "react";
import { EventScoreRecord } from "@/app/types/score";
import { calculatePercentage } from "@/app/lib/score-validation";
import { Award, Calendar, AlertCircle } from "lucide-react";

interface StudentEventScoresCardProps {
  scores?: EventScoreRecord[];
}

export default function StudentEventScoresCard({
  scores = [],
}: StudentEventScoresCardProps) {
  if (!scores || scores.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Award className="size-5 text-amber-500" />
          <h3 className="text-base font-bold text-slate-800">
            Event Performance
          </h3>
        </div>
        <div className="text-center py-8">
          <AlertCircle className="size-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-600">
            No event scores recorded
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Scores entered by coordinators for club hackathons and competitions will appear here.
          </p>
          <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Backend contract required: Supabase event_scores table
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="size-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-800">
              Event Performance
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluations recorded across hackathons and coding contests
          </p>
        </div>

        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          {scores.length} {scores.length === 1 ? "Event" : "Events"} Evaluated
        </span>
      </div>

      {/* Events Score List */}
      <div className="space-y-3">
        {scores.map((record) => {
          const percentage = calculatePercentage(record.score, record.maxScore);

          return (
            <div
              key={record.id}
              className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <span className="font-bold text-sm text-slate-800 block">
                  {record.eventName}
                </span>
                {record.subEventName && (
                  <span className="text-xs text-indigo-600 font-medium block">
                    Sub-event: {record.subEventName}
                  </span>
                )}
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Calendar className="size-3 text-slate-400" />
                  <span>
                    Evaluated on:{" "}
                    {new Date(record.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span>&bull; Evaluator: {record.enteredByName}</span>
                </div>
              </div>

              {/* Score and Percentage Display */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0">
                <div className="text-base font-black text-slate-900">
                  {record.score}{" "}
                  <span className="text-xs font-normal text-slate-500">
                    / {record.maxScore}
                  </span>
                </div>
                <span className="text-xs font-semibold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded">
                  {percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
