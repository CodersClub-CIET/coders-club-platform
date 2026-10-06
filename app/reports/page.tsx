"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Building2,
  GraduationCap,
  Calendar,
  Briefcase,
  Home as HomeIcon,
  Activity,
  Award,
  FileSpreadsheet,
} from "lucide-react";
import { Toaster } from "sonner";
import DepartmentReportsView from "@/components/reports/department-reports-view";
import StudentProfileView from "@/components/reports/student-profile-view";
import EventReportView from "@/components/reports/event-report-view";
import AssociateDutyView from "@/components/reports/associate-duty-view";

type ReportTab = "departments" | "student-lookup" | "event-summary" | "associate-duty";

export default function ReportsDashboardPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("departments");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Toast notifications container */}
      <Toaster richColors position="top-right" />

      <div>
        {/* Top Global Navigation Bar */}
        <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-30 mb-6 print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
                <BarChart3 className="size-5" />
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-tight text-slate-900 block">
                  Coders Club CIET
                </span>
                <span className="text-[10px] text-slate-500 block -mt-0.5">
                  Autonomous Institution &bull; Anna University
                </span>
              </div>
            </div>

            <nav className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/"
                className="text-xs font-semibold text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <HomeIcon className="size-3.5" />
                <span className="hidden sm:inline">Home</span>
              </Link>
              <Link
                href="/attendance"
                className="text-xs font-semibold text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Activity className="size-3.5" />
                <span className="hidden sm:inline">Attendance</span>
              </Link>
              <Link
                href="/scores"
                className="text-xs font-semibold text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Award className="size-3.5" />
                <span className="hidden sm:inline">Scores</span>
              </Link>
              <Link
                href="/associate-allocation"
                className="text-xs font-semibold text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Briefcase className="size-3.5" />
                <span className="hidden sm:inline">Allocations</span>
              </Link>
              <Link
                href="/reports"
                className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <FileSpreadsheet className="size-3.5" />
                <span>Reports</span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="px-4 sm:px-6 lg:px-8 pb-12">
          {/* Top Hero Banner */}
          <div className="max-w-7xl mx-auto mb-6 print:hidden">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 backdrop-blur-sm">
                      <BarChart3 className="size-3 text-indigo-300" />
                      Reports & Analytics
                    </span>
                    <span className="text-xs text-indigo-300 font-mono">v1.0.0</span>
                    <span className="text-xs text-indigo-200/80 font-medium hidden md:inline">
                      &bull; Coimbatore Institute of Engineering and Technology
                    </span>
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                    Reports & Analytics Console
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-indigo-200 max-w-2xl leading-relaxed">
                    Generate institutional attendance summaries, On-Duty (OD) verification rosters, student performance dossiers, and associate duty audit reports.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="max-w-7xl mx-auto mb-6 print:hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab("departments")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "departments"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Building2 className="size-3.5" />
                <span>Department Summaries</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("student-lookup")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "student-lookup"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <GraduationCap className="size-3.5" />
                <span>Student Lookup Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("event-summary")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "event-summary"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Calendar className="size-3.5" />
                <span>Event Performance</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("associate-duty")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "associate-duty"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Briefcase className="size-3.5" />
                <span>Associate Duty Roster</span>
              </button>
            </div>
          </div>

          {/* Active View Container */}
          <div className="max-w-7xl mx-auto">
            {activeTab === "departments" && <DepartmentReportsView />}
            {activeTab === "student-lookup" && <StudentProfileView />}
            {activeTab === "event-summary" && <EventReportView />}
            {activeTab === "associate-duty" && <AssociateDutyView />}
          </div>
        </main>
      </div>

      {/* Official CIET Institutional Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 sm:px-6 lg:px-8 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-900 font-bold text-xs">
              <GraduationCap className="size-4 text-indigo-600" />
              <span>Coimbatore Institute of Engineering and Technology</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Narasipuram (P.O), Thondamuthur (Via), Vellimalaipattinam, Coimbatore - 641109, Tamil Nadu &bull; Ph: +91 422-2970703
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Autonomous Institution Approved by AICTE, New Delhi &bull; Affiliated to Anna University, Chennai
            </p>
          </div>

          <div className="text-xs text-slate-400 sm:text-right">
            <span className="font-semibold text-slate-600">Coders Club Platform &bull; Reports Suite</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Standard RFC 4180 CSV & Official Letterhead Print</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
