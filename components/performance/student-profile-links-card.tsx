"use client";

import React from "react";
import { StudentSocialLinks } from "@/lib/performance/types";
import { ExternalLink, Globe, Info } from "lucide-react";

interface StudentProfileLinksCardProps {
  socialLinks?: StudentSocialLinks;
}

export default function StudentProfileLinksCard({
  socialLinks,
}: StudentProfileLinksCardProps) {
  const hasGithub = Boolean(socialLinks?.githubUrl?.trim());
  const hasLinkedin = Boolean(socialLinks?.linkedinUrl?.trim());

  return (
    <div className="bg-[#111318] rounded-2xl border border-[#292D33] p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#292D33] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="size-5 text-[#FF2A1A]" />
            <h3 className="text-base font-bold text-[#F3F1EC]">
              Professional Profiles
            </h3>
          </div>
          <p className="text-xs text-[#686C74] mt-0.5">
            Developer portfolios and professional networking links
          </p>
        </div>
      </div>

      {/* Links Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* GitHub Card */}
        <div className="p-4 rounded-xl bg-[#08090B] border border-[#292D33] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-[#08090B] text-white flex items-center justify-center font-bold text-xs shrink-0">
                GH
              </div>
              <div>
                <span className="text-sm font-bold text-[#F3F1EC] block">
                  GitHub
                </span>
                <span className="text-[11px] text-[#686C74] block">
                  Code Repositories & Activity
                </span>
              </div>
            </div>

            {hasGithub ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Linked
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-[#9B9EA6]">
                Not Linked
              </span>
            )}
          </div>

          <div>
            {hasGithub ? (
              <a
                href={socialLinks!.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF2A1A] hover:text-indigo-800 transition-colors"
              >
                <span>Visit GitHub Profile</span>
                <ExternalLink className="size-3.5" />
              </a>
            ) : (
              <p className="text-xs text-[#686C74] italic">
                GitHub URL not registered for this student.
              </p>
            )}
          </div>
        </div>

        {/* LinkedIn Card */}
        <div className="p-4 rounded-xl bg-[#08090B] border border-[#292D33] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-[#FF2A1A] text-white flex items-center justify-center font-bold text-xs shrink-0">
                in
              </div>
              <div>
                <span className="text-sm font-bold text-[#F3F1EC] block">
                  LinkedIn
                </span>
                <span className="text-[11px] text-[#686C74] block">
                  Professional Profile & Resume
                </span>
              </div>
            </div>

            {hasLinkedin ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Linked
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-[#9B9EA6]">
                Not Linked
              </span>
            )}
          </div>

          <div>
            {hasLinkedin ? (
              <a
                href={socialLinks!.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF2A1A] hover:text-blue-800 transition-colors"
              >
                <span>Visit LinkedIn Profile</span>
                <ExternalLink className="size-3.5" />
              </a>
            ) : (
              <p className="text-xs text-[#686C74] italic">
                LinkedIn URL not registered for this student.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Backend Contract Status Note */}
      <div className="rounded-xl bg-[#08090B] border border-[#292D33]/80 p-3.5 flex items-start gap-2.5 text-xs text-[#686C74]">
        <Info className="size-4 text-[#686C74] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-semibold text-[#9B9EA6]">Backend contract required:</span> Persistent storage, verification, and editing of external profile URLs will connect once the backend team provides the student profile schema in Supabase.
        </p>
      </div>
    </div>
  );
}
