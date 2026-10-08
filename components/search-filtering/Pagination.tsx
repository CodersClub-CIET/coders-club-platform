"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-[#292D33] bg-[#111318] px-4 py-3 shadow-sm">
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#292D33] bg-[#0D0F12] px-3 py-2 text-[11px] font-mono uppercase tracking-wider font-bold text-[#F3F1EC] transition hover:bg-[#1D2026] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={16} />
        Previous
      </button>

      <span className="text-[11px] font-mono uppercase tracking-widest text-[#9B9EA6]">
        Page{" "}
        <span className="font-bold text-[#F3F1EC] bg-[#FF2A1A] px-2 py-0.5 rounded">
          {currentPage}
        </span>{" "}
        of{" "}
        <span className="font-bold text-[#F3F1EC]">
          {totalPages}
        </span>
      </span>

      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#292D33] bg-[#0D0F12] px-3 py-2 text-[11px] font-mono uppercase tracking-wider font-bold text-[#F3F1EC] transition hover:bg-[#1D2026] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
        <ChevronRight size={16} />
      </button>
    </div>
  );
}