"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer, X, FileText } from "lucide-react";
import type { PrintLayoutOptions } from "@/lib/reports/types";
import { getDefaultPrintLayoutOptions, triggerPrint } from "@/lib/reports/export-utils";

export interface ReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  layoutOptions?: Partial<PrintLayoutOptions>;
  onExportCSV?: () => void;
  children: React.ReactNode;
}

/**
 * Reusable modal for institutional printable reports conforming to CIET standards.
 * Features the official letterhead, metadata block, printable document body,
 * and the 3-signatory block (Student Coordinator, Faculty Advisor, HOD).
 */
export default function ReportPrintModal({
  isOpen,
  onClose,
  title,
  subtitle,
  layoutOptions,
  onExportCSV,
  children,
}: ReportPrintModalProps) {
  if (!isOpen) return null;

  const defaultOptions = getDefaultPrintLayoutOptions(title, subtitle);
  const options: PrintLayoutOptions = {
    ...defaultOptions,
    ...layoutOptions,
    signatories: layoutOptions?.signatories || defaultOptions.signatories,
  };

  const handlePrint = () => {
    triggerPrint();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#08090B]/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-[#111318] print:static">
      <div className="relative w-full max-w-5xl bg-[#111318] rounded-2xl shadow-2xl border border-[#292D33] overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Top Modal Controls (Hidden in Print) */}
        <div className="px-6 py-4 bg-[#08090B] text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#FF2A1A]/30 text-indigo-400 border border-indigo-500/30">
              <FileText className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{options.title}</h2>
              <p className="text-[11px] text-[#686C74]">
                {options.subtitle || "Institutional Print & PDF Export Document"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onExportCSV && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onExportCSV}
                className="text-xs bg-[#1D2026] border-slate-700 text-slate-200 hover:bg-slate-700 gap-1.5"
              >
                <Download className="size-3.5" />
                <span>Export CSV</span>
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="text-xs bg-[#FF2A1A] hover:bg-[#FF2A1A] text-white gap-1.5 font-bold shadow-md shadow-indigo-600/30"
            >
              <Printer className="size-3.5" />
              <span>Print / Save PDF</span>
            </Button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 rounded-lg text-[#686C74] hover:text-white hover:bg-[#1D2026] transition-colors ml-2"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 sm:p-12 overflow-y-auto flex-1 font-serif text-[#F3F1EC] bg-[#111318] print:p-0 print:overflow-visible">
          
          {/* CIET Institutional Letterhead Header */}
          {options.includeLetterhead !== false && (
            <div className="text-center pb-6 border-b-2 border-slate-800 mb-6">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-[#F3F1EC] font-sans">
                {options.institutionName || "Coimbatore Institute of Engineering and Technology"}
              </h1>
              <p className="text-xs text-[#9B9EA6] font-sans mt-0.5 uppercase tracking-wider">
                {options.autonomousAffiliation ||
                  "(Autonomous Institution | Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai)"}
              </p>
              <p className="text-xs text-[#686C74] font-sans mt-0.5">
                {options.institutionAddress ||
                  "Narasipuram (P.O), Thondamuthur (Via), Vellimalaipattinam, Coimbatore - 641109, Tamil Nadu • Ph: +91 422-2970703"}
              </p>
              <div className="inline-block mt-3 px-4 py-1 rounded bg-[#171A20] border border-[#3A3E45]">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-widest font-sans text-indigo-900">
                  Department of Technical Clubs — Coders Club CIET
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold underline underline-offset-4 mt-3 uppercase font-sans">
                {options.title}
              </h2>
              {options.generatedAt && (
                <p className="text-[11px] text-[#686C74] font-sans mt-1">
                  Report Date: {options.generatedAt}
                </p>
              )}
            </div>
          )}

          {/* Dynamic Content Provided by the Calling View */}
          <div className="font-sans text-xs text-[#F3F1EC]">{children}</div>

          {/* Institutional 3-Signatories Footer */}
          {options.includeSignatures !== false && options.signatories && options.signatories.length > 0 && (
            <div className="pt-12 mt-12 border-t border-[#3A3E45] font-sans grid grid-cols-3 text-center text-xs text-[#F3F1EC] print:break-inside-avoid">
              {options.signatories.map((sig, idx) => (
                <div key={idx}>
                  <div className="h-10"></div>
                  <div className="font-bold border-t border-slate-400 pt-1.5 mx-4">
                    {sig.label}
                  </div>
                  {sig.title && (
                    <p className="text-[10px] text-[#686C74]">{sig.title}</p>
                  )}
                  {sig.department && (
                    <p className="text-[10px] text-[#686C74]">{sig.department}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
