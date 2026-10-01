"use client";

import React, { useEffect, useState } from "react";
import { PlatformAttendanceAnalytics } from "@/lib/attendance/types";
import { attendanceService } from "@/lib/attendance/attendance-service";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Building,
  CheckCircle2,
  Clock,
  Download,
  GraduationCap,
  PieChart,
  RefreshCw,
  Sun,
  Moon,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

export default function AttendanceAnalyticsView() {
  const [analytics, setAnalytics] = useState<PlatformAttendanceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await attendanceService.getPlatformAnalytics();
      setAnalytics(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleMasterExport = async () => {
    try {
      setExporting(true);
      await attendanceService.downloadMasterAttendanceCSV();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to export master attendance.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <RefreshCw className="size-8 text-indigo-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600">Compiling institution attendance analytics...</p>
      </div>
    );
  }

  if (!analytics) return null;

  const totalEntries = analytics.totalRecords;
  const deptEntries = Object.entries(analytics.departmentCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Master Export */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="size-4 text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              Department & Institutional Intelligence
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">Event Attendance Analytics</h2>
          <p className="text-xs text-indigo-200 mt-0.5">
            Aggregated metrics across all registered sessions for Coimbatore Institute of Engineering and Technology
          </p>
        </div>

        <Button
          type="button"
          onClick={handleMasterExport}
          disabled={exporting || totalEntries === 0}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 px-4 rounded-xl gap-2 shadow-md shrink-0 transition-all"
        >
          <Download className="size-3.5" />
          {exporting ? "Generating Sheet..." : "Export Master CSV (All Sessions)"}
        </Button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Users className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Scans</div>
            <div className="text-2xl font-extrabold text-slate-900">{analytics.totalRecords}</div>
            <div className="text-xs text-slate-400">Recorded across platform</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <GraduationCap className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unique Students</div>
            <div className="text-2xl font-extrabold text-slate-900">{analytics.distinctStudents}</div>
            <div className="text-xs text-slate-400">Distinct Roll Numbers</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
            <UserCheck className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Associates</div>
            <div className="text-2xl font-extrabold text-slate-900">{analytics.distinctAssociates}</div>
            <div className="text-xs text-slate-400">Club Executives & Leads</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <TrendingUp className="size-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sessions</div>
            <div className="text-2xl font-extrabold text-slate-900">{analytics.totalSessions}</div>
            <div className="text-xs text-emerald-600 font-medium">{analytics.activeSessions} active now</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Department Distribution + Year & Period Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Breakdown (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Building className="size-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Department Participation</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {deptEntries.length} departments recorded
            </span>
          </div>

          {deptEntries.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No departmental attendance recorded yet.
            </div>
          ) : (
            <div className="space-y-3.5">
              {deptEntries.map(([dept, count]) => {
                const percentage = totalEntries > 0 ? Math.round((count / totalEntries) * 100) : 0;
                return (
                  <div key={dept} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{dept}</span>
                      <span className="text-slate-500 font-mono">
                        {count} attendees <span className="text-slate-400">({percentage}%)</span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Year Breakdown & Period Comparison */}
        <div className="space-y-6">
          {/* Year Distribution */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="size-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Year-wise Distribution</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((year) => {
                const count = analytics.yearCounts[year] || 0;
                const percentage =
                  analytics.distinctStudents > 0
                    ? Math.round((count / analytics.distinctStudents) * 100)
                    : 0;

                return (
                  <div
                    key={year}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 flex flex-col justify-between"
                  >
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Year {year}
                    </span>
                    <div className="mt-2">
                      <div className="text-xl font-extrabold text-slate-900">{count}</div>
                      <div className="text-[10px] text-slate-500">{percentage}% of students</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Period Distribution */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="size-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Period Distribution</h3>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sun className="size-4 text-amber-600" />
                  <div>
                    <div className="text-xs font-bold text-amber-900">Morning Sessions</div>
                    <div className="text-[10px] text-amber-700">Tracked check-ins</div>
                  </div>
                </div>
                <div className="text-lg font-extrabold text-amber-900">
                  {analytics.periodCounts.morning}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Moon className="size-4 text-blue-600" />
                  <div>
                    <div className="text-xs font-bold text-blue-900">Afternoon Sessions</div>
                    <div className="text-[10px] text-blue-700">Tracked check-ins</div>
                  </div>
                </div>
                <div className="text-lg font-extrabold text-blue-900">
                  {analytics.periodCounts.afternoon}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
