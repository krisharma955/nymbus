"use client";

import React, { useEffect } from "react";
import {
  X,
  Download,
} from "lucide-react";
import { ReportDetailResponse, ReportCitationResponse } from "@/types/nymbus";
import { ReportSectionViewer } from "./ReportSectionViewer";
import { api } from "@/lib/api";

interface ResearchReportModalProps {
  report: ReportDetailResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onCitationClick: (evidenceId: string, citation?: ReportCitationResponse) => void;
}

export function ResearchReportModal({
  report,
  isOpen,
  onClose,
  onCitationClick,
}: ResearchReportModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !report) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-5xl h-[92vh] bg-[#0A0C10] border border-[#1C202A] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="h-14 px-6 border-b border-[#1C202A] bg-[#0C0E14] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4A373] shadow-[0_0_8px_#D4A373]" />
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-xs font-mono text-slate-400">RESEARCH REPORT</span>
              <span className="text-slate-600">/</span>
              <h2 className="text-sm font-semibold text-[#F8FAFC] truncate max-w-md sm:max-w-xl">
                {report.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={api.getExportUrl(report.id, "markdown")}
              download={`${report.title || "research-report"}.md`}
              className="px-3 py-1.5 rounded-lg bg-[#141822] hover:bg-[#1C2230] text-slate-300 hover:text-white border border-[#1C202A] text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Download Markdown"
            >
              <Download className="w-3.5 h-3.5 text-[#D4A373]" />
              <span className="hidden sm:inline">Export MD</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-thin">
          <ReportSectionViewer
            report={report}
            onCitationClick={onCitationClick}
          />
        </div>
      </div>
    </div>
  );
}
