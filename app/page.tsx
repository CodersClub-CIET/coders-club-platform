import React from "react";
import Link from "next/link";
import {
  Activity,
  Calendar,
  CheckCircle2,
  FileText,
  GraduationCap,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <QrCode className="size-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white block">
                Coders Club CIET
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">
                Autonomous Institution &bull; Anna University
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/attendance/scan"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg transition-colors hidden sm:inline-flex items-center gap-1.5"
            >
              <QrCode className="size-3.5" />
              <span>Student Scan</span>
            </Link>
            <Link
              href="/attendance"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30"
            >
              <Activity className="size-3.5" />
              <span>Attendance Console</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 backdrop-blur-md mb-4">
            <Sparkles className="size-3.5 text-indigo-400" />
            <span>Official Event Management & Evaluation Suite</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Empowering CIET Coders with <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              Smart Attendance & Evaluations
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            The unified platform for Coimbatore Institute of Engineering and Technology’s
            Coders Club. Server-authoritative 5-minute QR attendance, single-device anti-proxy check-in, and institutional OD letter generation.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-6 w-full">
          {/* Card 1: Attendance Management */}
          <div className="group relative bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/50 rounded-3xl p-6 transition-all shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between">
            <div>
              <div className="size-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <QrCode className="size-6" />
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Attendance
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Module
                </span>
              </div>

              <h2 className="text-lg font-bold text-white mb-2">
                Attendance Management
              </h2>

              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Launch morning/afternoon sessions, project high-contrast 5-minute QR codes with anti-replay challenge verification, and record verified student presence.
              </p>

              <div className="space-y-1.5 mb-6 text-[11px] text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-indigo-400 shrink-0" />
                  <span>5-minute fixed QR token validity</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-indigo-400 shrink-0" />
                  <span>Strict single-device check-in restriction</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-indigo-400 shrink-0" />
                  <span>Realtime Live Monitor with duplicate prevention</span>
                </div>
              </div>
            </div>

            <Link
              href="/attendance"
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/30"
            >
              <span>Open Attendance Console</span>
              <Zap className="size-3.5" />
            </Link>
          </div>

          {/* Card 2: On-Duty (OD) Reports */}
          <div className="group relative bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500/50 rounded-3xl p-6 transition-all shadow-xl hover:shadow-purple-500/10 flex flex-col justify-between">
            <div>
              <div className="size-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <FileText className="size-6" />
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  College Submission
                </span>
              </div>

              <h2 className="text-lg font-bold text-white mb-2">
                Official OD Report Generator
              </h2>

              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Instantly export formal institutional On-Duty (OD) verification sheets with Anna University letterhead, department roster tables, and coordinator signatures.
              </p>

              <div className="space-y-1.5 mb-6 text-[11px] text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-purple-400 shrink-0" />
                  <span>Official CIET address & autonomous letterhead</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-purple-400 shrink-0" />
                  <span>Filter by CSE, IT, Cyber, AI&ML, etc.</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-purple-400 shrink-0" />
                  <span>1-click Print & PDF ready format</span>
                </div>
              </div>
            </div>

            <Link
              href="/attendance"
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-600/30"
            >
              <span>View OD Generator</span>
              <FileText className="size-3.5" />
            </Link>
          </div>
        </div>
      </main>

      {/* Official CIET Footer Box */}
      <footer className="border-t border-slate-800 bg-slate-950/80 py-8 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-white font-bold text-sm">
              <GraduationCap className="size-4 text-indigo-400" />
              <span>Coimbatore Institute of Engineering and Technology</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Narasipuram (P.O), Thondamuthur (Via), Vellimalaipattinam, Coimbatore - 641109, Tamil Nadu &bull; Ph: +91 422-2970703
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Autonomous Institution Approved by AICTE, New Delhi &bull; Affiliated to Anna University, Chennai
            </p>
          </div>

          <div className="text-xs text-slate-500 sm:text-right">
            <span className="font-semibold text-slate-400">Coders Club Platform</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Built with Next.js 16 & Supabase</p>
          </div>
        </div>
      </footer>
    </div>
  );
}