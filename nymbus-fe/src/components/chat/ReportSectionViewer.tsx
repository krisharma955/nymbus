"use client";

import React, { useState } from "react";
import {
  Download,
  FileText,
  CheckCircle2,
  ChevronDown,
  BookMarked,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { ReportDetailResponse, ReportCitationResponse } from "@/types/nymbus";
import { CitationBadge } from "./CitationBadge";
import { api } from "@/lib/api";

interface ReportSectionViewerProps {
  report: ReportDetailResponse;
  onCitationClick: (evidenceId: string, citation?: ReportCitationResponse) => void;
}

export function ReportSectionViewer({
  report,
  onCitationClick,
}: ReportSectionViewerProps) {
  const [copied, setCopied] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleCopyMarkdown = () => {
    const fullText =
      (report.executiveSummary ? `## Executive Summary\n\n${report.executiveSummary}\n\n` : "") +
      (report.contentMarkdown ||
        report.sections
          ?.map((s) => `### ${s.title}\n\n${s.contentMarkdown}`)
          .join("\n\n"));
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Build a lookup map of citationLabel -> ReportCitationResponse for fast reference
  const citationMap = new Map<string, ReportCitationResponse>();
  report.sections?.forEach((sec) => {
    sec.citations?.forEach((cit) => {
      citationMap.set(cit.citationLabel, cit);
    });
  });

  // Helper to parse markdown text and replace [1], [2], [C1] with interactive CitationBadge components
  const renderInteractiveText = (text: string) => {
    if (!text) return null;

    // Pattern matches bracketed citations like [1], [2], [C1], [cit-1]
    const parts = text.split(/(\[[A-Za-z0-9_-]+\])/g);

    return parts.map((part, index) => {
      const match = part.match(/^\[([A-Za-z0-9_-]+)\]$/);
      if (match) {
        const citation = citationMap.get(part);
        if (citation) {
          return (
            <CitationBadge
              key={index}
              label={part}
              evidenceId={citation.evidenceId}
              status={citation.verificationStatus}
              confidence={Number(citation.confidenceScore)}
              onClick={(id) => onCitationClick(id, citation)}
            />
          );
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="space-y-6">
      {/* Report Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#13161D] border border-[#1C202A] rounded-xl">
        <div className="flex items-center gap-3">
          <BookMarked className="w-5 h-5 text-[#D4A373]" />
          <div>
            <h2 className="text-sm font-semibold text-[#F8FAFC]">
              {report.title || "Synthesized Research Dossier"}
            </h2>
            <div className="text-[11px] font-mono text-slate-400" suppressHydrationWarning>
              Version {report.version} · Completed{" "}
              {mounted && report.completedAt ? new Date(report.completedAt).toLocaleTimeString() : "Just now"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Markdown */}
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#090A0D] border border-[#1C202A] text-slate-300 hover:text-white hover:border-[#D4A373]/40 transition-colors"
            title="Copy Report Markdown"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#D4A373] text-[#090A0D] hover:bg-[#c69363] transition-colors font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {exportOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#0E1015] border border-[#1C202A] rounded-lg shadow-2xl py-1 z-30 font-sans text-xs">
                <a
                  href={api.getExportUrl(report.id, "markdown")}
                  download
                  onClick={() => setExportOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-[#D4A373]" />
                  <span>Markdown (.md)</span>
                </a>
                <a
                  href={api.getExportUrl(report.id, "html")}
                  download
                  onClick={() => setExportOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Interactive HTML (.html)</span>
                </a>
                <a
                  href={api.getExportUrl(report.id, "json")}
                  download
                  onClick={() => setExportOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Audited JSON (.json)</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      {report.executiveSummary && (
        <div className="p-5 rounded-xl bg-[#0E1015] border border-[#D4A373]/30 space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A373]/5 rounded-full blur-2xl pointer-events-none" />
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#D4A373] font-semibold flex items-center gap-2">
            <span>Executive Synthesis</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4A373]" />
          </div>
          <div className="text-sm font-sans text-[#F8FAFC] leading-relaxed whitespace-pre-wrap">
            {renderInteractiveText(report.executiveSummary)}
          </div>
        </div>
      )}

      {/* Report Sections (Phase 4 Structured Sections) */}
      {report.sections && report.sections.length > 0 ? (
        <div className="space-y-6">
          {report.sections.map((sec, idx) => (
            <div
              key={sec.id || idx}
              className="p-6 rounded-xl bg-[#090A0D] border border-[#1C202A] space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#1C202A]">
                <h3 className="text-base font-semibold text-[#F8FAFC]">
                  {sec.title}
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  Section {sec.sectionOrder || idx + 1}
                </span>
              </div>

              <div className="text-sm text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">
                {renderInteractiveText(sec.contentMarkdown)}
              </div>

              {/* Citations Footer for this section */}
              {sec.citations && sec.citations.length > 0 && (
                <div className="pt-3 border-t border-[#1C202A]/80 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    Passage Evidence:
                  </span>
                  {sec.citations.map((c) => (
                    <CitationBadge
                      key={c.id}
                      label={c.citationLabel}
                      evidenceId={c.evidenceId}
                      status={c.verificationStatus}
                      confidence={Number(c.confidenceScore)}
                      onClick={(id) => onCitationClick(id, c)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : report.contentMarkdown ? (
        <div className="p-6 rounded-xl bg-[#090A0D] border border-[#1C202A] text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
          {renderInteractiveText(report.contentMarkdown)}
        </div>
      ) : null}
    </div>
  );
}
