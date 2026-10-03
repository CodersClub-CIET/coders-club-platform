import React from "react";
import ScoreManagementTable from "@/app/scores/components/ScoreManagementTable";

export const metadata = {
  title: "Score Management | Coders Club Platform",
  description: "Manage and validate student event performance scores",
};

export default function ScoreManagementPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Banner / Header Section */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 backdrop-blur-sm">
                  Score Module
                </span>
                <span className="text-xs text-indigo-300 font-mono">
                  v1.0.0
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                Score Management
              </h1>
              <p className="mt-2 text-sm sm:text-base text-indigo-200 max-w-2xl">
                Manage and validate student event performance scores across departmental events and competitions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Component */}
      <ScoreManagementTable />
    </main>
  );
}
