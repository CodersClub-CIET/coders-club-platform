"use client";

import React from "react";
import { Info } from "lucide-react";

export default function StudentPerformanceView() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="bg-[#111318] rounded-2xl border border-[#292D33] p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#F3F1EC]">
          Student Performance Dashboard
        </h2>
        <p className="text-xs text-[#686C74] mt-1">
          Student performance information will be available here once its data
          sources are approved and connected.
        </p>
      </div>

      <div
        role="status"
        className="bg-[#111318] rounded-2xl border border-indigo-200 p-8 shadow-sm"
      >
        <div className="max-w-2xl mx-auto flex items-start gap-3">
          <Info className="size-5 text-[#FF2A1A] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#F3F1EC]">
              Student Performance integration pending
            </h3>
            <p className="text-xs text-[#9B9EA6] leading-relaxed">
              This dashboard is not connected to verified student performance
              data yet. No student records or scores are being loaded or shown.
              It will be enabled after the required data sources and access
              rules are confirmed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
