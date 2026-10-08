"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, Terminal, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/use-auth";

export default function PublicLandingPage() {
  const router = useRouter();
  const { role, status } = useAuth();

  useEffect(() => {
    if (status === "authorized" && role) {
      router.replace(role === "admin" ? "/admin/dashboard" : "/associate/dashboard");
    }
  }, [role, router, status]);

  return (
    <div className="min-h-screen bg-[#08090B] text-[#F3F1EC] selection:bg-[#FF2A1A] selection:text-white flex flex-col justify-between">
      {/* Top Technical Navigation */}
      <header className="border-b border-[#292D33] bg-[#08090B]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded border border-[#292D33] bg-[#0D0F12] text-[#FF2A1A]">
              <Terminal className="size-4" />
            </div>
            <div>
              <span className="block font-mono text-xs font-bold tracking-[0.2em] text-[#F3F1EC]">
                CODERS CLUB CIET
              </span>
              <span className="block font-mono text-[10px] tracking-widest text-[#686C74] uppercase">
                DIGITAL OPERATIONS PLATFORM
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] text-[#9B9EA6] tracking-widest uppercase border border-[#292D33] px-3 py-1.5 rounded bg-[#0D0F12]">
              <span className="size-1.5 rounded-full bg-[#32C979] animate-pulse" />
              <span>SYS // ONLINE</span>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 border border-[#292D33] bg-[#111318] px-4 py-2 font-mono text-xs font-semibold tracking-wider text-[#F3F1EC] hover:border-[#FF2A1A]/50 hover:bg-[#171A20] transition-colors rounded"
            >
              <span>ACCESS WORKSPACE</span>
              <ArrowRight className="size-3.5 text-[#FF2A1A]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Editorial Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-6 pt-16 pb-20 sm:px-8 lg:px-12 space-y-16">
          {/* Eyebrow & Headline Block */}
          <div className="space-y-6 max-w-5xl">
            <div className="flex items-center gap-2.5">
              <span className="h-[2px] w-8 bg-[#FF2A1A]" />
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-[#FF2A1A]">
                CIET // CODING OPERATIONS ARCHITECTURE
              </p>
            </div>

            <h1 className="font-display-hero text-[#F3F1EC] tracking-tighter">
              EVERYTHING <br />
              YOUR CODING CLUB <br />
              <span className="text-[#9B9EA6] font-light">DOES.</span>
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-4 items-end">
              <p className="md:col-span-8 text-base sm:text-lg text-[#9B9EA6] font-normal leading-relaxed max-w-2xl">
                Events. Attendance. Teams. Scores. Associates. One unified engineering operations platform built for Coimbatore Institute of Engineering and Technology.
              </p>

              <div className="md:col-span-4 flex flex-col sm:flex-row md:flex-col gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-between gap-3 bg-[#FF2A1A] hover:bg-[#C51D16] text-white px-6 py-4 font-mono text-xs font-bold uppercase tracking-widest rounded transition-all shadow-[0_0_25px_-5px_rgba(255,42,26,0.3)]"
                >
                  <span>ENTER PLATFORM</span>
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/associate-request"
                  className="inline-flex items-center justify-between gap-3 border border-[#292D33] bg-[#0D0F12] hover:bg-[#111318] text-[#9B9EA6] hover:text-[#F3F1EC] px-6 py-4 font-mono text-xs font-medium uppercase tracking-widest rounded transition-colors"
                >
                  <span>REQUEST ASSOCIATE ACCESS</span>
                  <ChevronRight className="size-4 text-[#686C74]" />
                </Link>
              </div>
            </div>
          </div>

          {/* Full-Width Horizontal Editorial Data Strip */}
          <div className="border-y border-[#292D33] py-8 grid grid-cols-2 lg:grid-cols-4 gap-8 divide-y lg:divide-y-0 lg:divide-x divide-[#292D33]">
            <div className="space-y-1.5 pt-4 lg:pt-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#686C74]">
                01 // OPERATIONS
              </p>
              <p className="font-display text-2xl font-light text-[#F3F1EC]">
                EVENT HIERARCHIES
              </p>
              <p className="font-mono text-xs text-[#9B9EA6]">
                Multi-round evaluation pipelines
              </p>
            </div>

            <div className="space-y-1.5 pt-4 lg:pt-0 lg:pl-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#686C74]">
                02 // VERIFICATION
              </p>
              <p className="font-display text-2xl font-light text-[#F3F1EC]">
                DYNAMIC QR PROTOCOL
              </p>
              <p className="font-mono text-xs text-[#9B9EA6]">
                Anti-replay rotating cryptographic tokens
              </p>
            </div>

            <div className="space-y-1.5 pt-4 lg:pt-0 lg:pl-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#686C74]">
                03 // EVALUATION
              </p>
              <p className="font-display text-2xl font-light text-[#F3F1EC]">
                REALTIME SCORING
              </p>
              <p className="font-mono text-xs text-[#9B9EA6]">
                Relational scoring with live audit trail
              </p>
            </div>

            <div className="space-y-1.5 pt-4 lg:pt-0 lg:pl-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#686C74]">
                04 // PERSONNEL
              </p>
              <p className="font-display text-2xl font-light text-[#F3F1EC]">
                ASSOCIATE ROSTER
              </p>
              <p className="font-mono text-xs text-[#9B9EA6]">
                Quota-independent credential activation
              </p>
            </div>
          </div>

          {/* Asymmetric Editorial Feature Roster */}
          <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between border-b border-[#292D33] pb-4">
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-[#9B9EA6]">
                PLATFORM CAPABILITIES // ARCHITECTURE MATRIX
              </h2>
              <span className="font-mono text-[11px] text-[#686C74]">
                CIET CORE SPECIFICATION
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Feature 01: Large Left Panel */}
              <div className="lg:col-span-7 border border-[#292D33] bg-[#0D0F12] p-8 sm:p-10 space-y-6 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-24 h-[2px] bg-[#FF2A1A]" />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#FF2A1A]">
                    SEC // 01 · ACCESS CONTROL
                  </span>
                  <span className="font-mono text-[10px] text-[#686C74] uppercase tracking-widest border border-[#292D33] px-2.5 py-1 rounded">
                    ROLE ENFORCED
                  </span>
                </div>
                <h3 className="font-display text-3xl sm:text-4xl font-light text-[#F3F1EC] leading-tight">
                  Dual-Tier Governance with Server-Verified Authorizations.
                </h3>
                <p className="text-sm text-[#9B9EA6] leading-relaxed max-w-xl">
                  Administrators command club-wide configurations, associate approvals, and allocations. Associates execute operational check-ins, attendances, and score inputs with strict row-level security.
                </p>
                <div className="pt-4 border-t border-[#292D33] flex flex-wrap gap-4 font-mono text-xs text-[#686C74]">
                  <span>• Row-Level Security</span>
                  <span>• Realtime Channels</span>
                  <span>• Cryptographic Nonces</span>
                </div>
              </div>

              {/* Feature 02 & 03: Stacked Right Panels */}
              <div className="lg:col-span-5 space-y-8">
                <div className="border border-[#292D33] bg-[#0D0F12] p-8 space-y-4 relative group">
                  <div className="absolute top-0 left-0 w-12 h-[2px] bg-[#FF2A1A]" />
                  <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#9B9EA6]">
                    OPS // 02 · VERIFICATION
                  </span>
                  <h4 className="font-display text-2xl font-light text-[#F3F1EC]">
                    Dynamic Anti-Replay QR Station
                  </h4>
                  <p className="text-xs text-[#9B9EA6] leading-relaxed">
                    Automated challenge rotation with short-validity windows prevents screenshot sharing and duplicate registrations during institutional sessions.
                  </p>
                </div>

                <div className="border border-[#292D33] bg-[#0D0F12] p-8 space-y-4 relative group">
                  <div className="absolute top-0 left-0 w-12 h-[2px] bg-[#FF2A1A]" />
                  <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#9B9EA6]">
                    EVAL // 03 · RECORDING
                  </span>
                  <h4 className="font-display text-2xl font-light text-[#F3F1EC]">
                    Relational Score & Coin Matrix
                  </h4>
                  <p className="text-xs text-[#9B9EA6] leading-relaxed">
                    Granular evaluations linked to academic profiles, class sections, and team rosters with exportable institutional reports.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Editorial Technical Footer */}
      <footer className="border-t border-[#292D33] bg-[#08090B] py-8 text-xs font-mono text-[#686C74]">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 CODERS CLUB CIET. ALL OPERATIONAL RIGHTS RESERVED.</p>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-[#F3F1EC] transition-colors">
              AUTHENTICATE
            </Link>
            <Link href="/associate-request" className="hover:text-[#F3F1EC] transition-colors">
              ACCESS REQUEST
            </Link>
            <Link href="/associate-activate" className="hover:text-[#F3F1EC] transition-colors">
              ACTIVATION
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
