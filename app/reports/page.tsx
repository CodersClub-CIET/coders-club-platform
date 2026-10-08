"use client";

import React, { useState } from "react";
import {
  BarChart3,
  Building2,
  GraduationCap,
  Calendar,
  Briefcase,
} from "lucide-react";
import { Toaster } from "sonner";
import { ManagementGuard } from "@/components/auth/management-guard";
import DepartmentReportsView from "@/components/reports/department-reports-view";
import StudentProfileView from "@/components/reports/student-profile-view";
import EventReportView from "@/components/reports/event-report-view";
import AssociateDutyView from "@/components/reports/associate-duty-view";
import { PageHeader, LargeNumericBlock } from "@/components/ui/cyberpunk";

type ReportTab = "departments" | "student-lookup" | "event-summary" | "associate-duty";

const TABS: { id: ReportTab; label: string; icon: typeof Building2 }[] = [
  { id: "departments", label: "Department Summaries", icon: Building2 },
  { id: "student-lookup", label: "Student Dossier", icon: GraduationCap },
  { id: "event-summary", label: "Event Performance", icon: Calendar },
  { id: "associate-duty", label: "Associate Duty Log", icon: Briefcase },
];

export default function ReportsDashboardPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("departments");

  return (
    <ManagementGuard>
      <Toaster richColors position="top-right" />
      <div className="space-y-10 print:space-y-4">
        {/* Page header directly on dark workspace */}
        <div className="print:hidden">
          <PageHeader
            moduleCode="EVAL // 03"
            category="ANALYTICS"
            title="Club Performance & Reports"
            description="Generate institutional attendance summaries, On-Duty verification rosters, student performance dossiers, and associate duty audit reports."
            icon={BarChart3}
          />
        </div>

        {/* Large Typographic Performance Metrics Strip */}
        <section className="print:hidden space-y-3">
          <div className="flex items-center justify-between border-b border-[#292D33] pb-2">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#9B9EA6]">
              AGGREGATED METRICS // OVERALL PERFORMANCE
            </h2>
            <span className="font-mono text-[10px] text-[#686C74] uppercase tracking-wider">
              INSTITUTIONAL BENCHMARK
            </span>
          </div>

          <div className="border-y border-[#292D33] py-8 grid grid-cols-2 lg:grid-cols-4 gap-8 divide-y lg:divide-y-0 lg:divide-x divide-[#292D33]">
            <LargeNumericBlock
              label="01 // AVERAGE SCORE"
              value="82.4"
              subtext="Normalized performance index across events"
              trend="+3.2%"
            />

            <LargeNumericBlock
              label="02 // PARTICIPATIONS"
              value="1,248"
              subtext="Verified student event completions"
              className="lg:pl-8 pt-4 lg:pt-0"
            />

            <LargeNumericBlock
              label="03 // SESSIONS RUN"
              value="42"
              subtext="Dynamic QR and coordinator checkpoints"
              className="lg:pl-8 pt-4 lg:pt-0"
            />

            <LargeNumericBlock
              label="04 // ACTIVE DEPARTMENTS"
              value="08"
              subtext="Represented branches in activity roster"
              className="lg:pl-8 pt-4 lg:pt-0"
            />
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#292D33] pb-3 print:hidden">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 transition-all font-mono text-xs uppercase tracking-wider px-4 py-2.5 rounded ${
                  active
                    ? "bg-[#292D33] text-[#F3F1EC] font-semibold border-b-2 border-[#FF2A1A]"
                    : "bg-transparent text-[#9B9EA6] hover:bg-[#111318] hover:text-[#F3F1EC]"
                }`}
              >
                <Icon className={`size-3.5 ${active ? "text-[#FF2A1A]" : "text-[#686C74]"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active report view */}
        <div className="pt-2">
          {activeTab === "departments" && <DepartmentReportsView />}
          {activeTab === "student-lookup" && <StudentProfileView />}
          {activeTab === "event-summary" && <EventReportView />}
          {activeTab === "associate-duty" && <AssociateDutyView />}
        </div>
      </div>
    </ManagementGuard>
  );
}
