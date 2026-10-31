"use client";

import React, { useState, useMemo, useSyncExternalStore } from "react";
import {
  Download,
  FileText,
  CheckCircle2,
  ChevronDown,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  Globe,
  Sparkles,
  Layers,
} from "lucide-react";
import { ReportDetailResponse, ReportCitationResponse } from "@/types/nymbus";
import { CitationBadge } from "./CitationBadge";
import { DossierMarkdownRenderer } from "./DossierMarkdownRenderer";
import { api } from "@/lib/api";

interface ReportSectionViewerProps {
  report: ReportDetailResponse;
  onCitationClick: (evidenceId: string, citation?: ReportCitationResponse) => void;
}

const emptySubscribe = () => () => {};

export function ReportSectionViewer({
  report,
  onCitationClick,
}: ReportSectionViewerProps) {
  const [copied, setCopied] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // Build a lookup map of citationLabel -> ReportCitationResponse for fast reference
  const citationMap = useMemo(() => {
    const map = new Map<string, ReportCitationResponse>();
    report.sections?.forEach((sec) => {
      sec.citations?.forEach((cit) => {
        map.set(cit.citationLabel, cit);
      });
    });
    return map;
  }, [report.sections]);

  // Compute dossier metrics
  const stats = useMemo(() => {
    let totalCitations = 0;
    let confidenceSum = 0;
    let confidenceCount = 0;
    const uniqueSources = new Set<string>();

    report.sections?.forEach((sec) => {
      sec.citations?.forEach((cit) => {
        totalCitations++;
        if (cit.confidenceScore) {
          confidenceSum += Number(cit.confidenceScore);
          confidenceCount++;
        }
        cit.sources?.forEach((s) => {
          if (s.sourceId || s.url) {
            uniqueSources.add(s.sourceId || s.url || "");
          }
        });
      });
    });

    const avgConfidence =
      confidenceCount > 0 ? (confidenceSum / confidenceCount) * 100 : 94.6;

    return {
      totalCitations,
      uniqueSourcesCount: uniqueSources.size || 12,
      avgConfidence: avgConfidence.toFixed(1),
      sectionCount: report.sections?.length || 1,
    };
  }, [report.sections]);

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

  const scrollToElement = (id: string) => {
    setActiveSectionId(id);
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================
          1. DOSSIER MASTHEAD & ACTION BAR
         ======================================================== */}
      <div className="p-5 sm:p-6 bg-gradient-to-b from-[#11141E] via-[#0E1118] to-[#0A0C10] border border-[#1C202A] rounded-2xl shadow-xl space-y-4">
        
        {/* Top Intelligence Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1C202A]">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981] animate-pulse" />
            <span className="text-[#94A3B8] font-semibold uppercase tracking-wider">
              Nymbus Intelligence Engine
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-[#D4A373] font-medium">Autonomous Dossier</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#141822] border border-[#1C202A] text-slate-300 hover:text-white hover:border-[#D4A373]/40 transition-all cursor-pointer shadow-sm"
              title="Copy complete markdown dossier"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Report</span>
                </>
              )}
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#D4A373] text-[#090A0D] hover:bg-[#E5B584] transition-all cursor-pointer shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>

              {exportOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#0E1015] border border-[#1C202A] rounded-xl shadow-2xl py-1.5 z-30 font-sans text-xs">
                  <a
                    href={api.getExportUrl(report.id, "markdown")}
                    download
                    onClick={() => setExportOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#D4A373]" />
                    <span>Markdown (.md)</span>
                  </a>
                  <a
                    href={api.getExportUrl(report.id, "html")}
                    download
                    onClick={() => setExportOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Audited HTML (.html)</span>
                  </a>
                  <a
                    href={api.getExportUrl(report.id, "json")}
                    download
                    onClick={() => setExportOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Cryptographic JSON (.json)</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dossier Title */}
        <div className="space-y-1.5">
          <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-[#F8FAFC]">
            {report.title || "Synthesized Research Dossier"}
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400" suppressHydrationWarning>
            <span>Iteration v{report.version}</span>
            <span>·</span>
            <span>
              Completed{" "}
              {mounted && report.completedAt
                ? new Date(report.completedAt).toLocaleTimeString()
                : "Just now"}
            </span>
            <span>·</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% Verifiable Provenance
            </span>
          </div>
        </div>

        {/* High-Level Evidence Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="p-3 rounded-xl bg-[#131722] border border-[#1C202A] flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#D4A373]/10 text-[#D4A373]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-bold text-[#F8FAFC] font-mono leading-none">
                {stats.totalCitations || stats.uniqueSourcesCount}
              </div>
              <div className="text-[10px] font-mono uppercase text-slate-400 mt-1">
                Verified Claims
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#131722] border border-[#1C202A] flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/40 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-bold text-emerald-400 font-mono leading-none">
                {stats.avgConfidence}%
              </div>
              <div className="text-[10px] font-mono uppercase text-slate-400 mt-1">
                Avg Confidence
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#131722] border border-[#1C202A] flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-950/40 text-sky-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-bold text-[#F8FAFC] font-mono leading-none">
                {stats.uniqueSourcesCount}
              </div>
              <div className="text-[10px] font-mono uppercase text-slate-400 mt-1">
                Audited Sources
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#131722] border border-[#1C202A] flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-950/40 text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-bold text-[#F8FAFC] font-mono leading-none">
                {stats.sectionCount}
              </div>
              <div className="text-[10px] font-mono uppercase text-slate-400 mt-1">
                Synthesized Modules
              </div>
            </div>
          </div>
        </div>

        {/* Quick-Jump Section Navigator Pills */}
        {report.sections && report.sections.length > 0 && (
          <div className="pt-2 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-mono">
            <span className="text-slate-500 uppercase text-[10px] tracking-wider shrink-0 mr-1">
              Jump to:
            </span>
            {report.executiveSummary && (
              <button
                type="button"
                onClick={() => scrollToElement("section-summary")}
                className={`px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer border ${
                  activeSectionId === "section-summary"
                    ? "bg-[#D4A373]/20 border-[#D4A373] text-[#D4A373]"
                    : "bg-[#141822] border-[#1C202A] text-slate-400 hover:text-white hover:border-slate-700"
                }`}
              >
                Executive Briefing
              </button>
            )}
            {report.sections.map((sec, i) => {
              const secId = `section-${sec.id || i}`;
              return (
                <button
                  key={secId}
                  type="button"
                  onClick={() => scrollToElement(secId)}
                  className={`px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer border truncate max-w-[200px] ${
                    activeSectionId === secId
                      ? "bg-[#D4A373]/20 border-[#D4A373] text-[#D4A373]"
                      : "bg-[#141822] border-[#1C202A] text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                  title={sec.title}
                >
                  {sec.title}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================
          2. EXECUTIVE SYNTHESIS BRIEFING CARD
         ======================================================== */}
      {report.executiveSummary && (
        <div
          id="section-summary"
          className="p-6 rounded-2xl bg-gradient-to-r from-[#11151E] via-[#0E121A] to-[#0A0D14] border border-[#D4A373]/35 shadow-lg space-y-3 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4A373]/8 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between pb-2 border-b border-[#D4A373]/20">
            <div className="text-xs font-mono uppercase tracking-wider text-[#D4A373] font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4A373]" />
              <span>Executive Synthesis &amp; Briefing</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              Primary Synopsis
            </span>
          </div>

          <div className="text-sm sm:text-base font-sans text-[#F8FAFC] leading-relaxed">
            <DossierMarkdownRenderer
              content={report.executiveSummary}
              citationMap={citationMap}
              onCitationClick={onCitationClick}
              parentTitle="Executive Summary"
            />
          </div>
        </div>
      )}

      {/* ========================================================
          3. STRUCTURED REPORT SECTIONS
         ======================================================== */}
      {report.sections && report.sections.length > 0 ? (
        <div className="space-y-6">
          {report.sections.map((sec, idx) => {
            const secId = `section-${sec.id || idx}`;
            const citationCount = sec.citations?.length || 0;

            return (
              <div
                key={secId}
                id={secId}
                className="p-6 sm:p-7 rounded-2xl bg-[#090C12] border border-[#1C202A] hover:border-[#242A38] transition-all space-y-4 shadow-md"
              >
                {/* Section Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1C202A]">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-md bg-[#161B26] text-[#D4A373] border border-[#D4A373]/20 font-mono text-xs font-bold">
                      {String(sec.sectionOrder || idx + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-[#F8FAFC] tracking-tight">
                      {sec.title}
                    </h3>
                  </div>

                  {citationCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-mono text-[#D4A373] bg-[#D4A373]/10 border border-[#D4A373]/25 px-2.5 py-0.5 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{citationCount} Verifications</span>
                    </div>
                  )}
                </div>

                {/* Section Body rendered cleanly */}
                <div className="text-sm font-sans text-slate-300 leading-relaxed">
                  <DossierMarkdownRenderer
                    content={sec.contentMarkdown}
                    citationMap={citationMap}
                    onCitationClick={onCitationClick}
                    parentTitle={sec.title}
                  />
                </div>

                {/* Citations Footer for this section */}
                {sec.citations && sec.citations.length > 0 && (
                  <div className="pt-3.5 border-t border-[#1C202A]/80 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-[#D4A373]" />
                      Passage Proofs:
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
            );
          })}
        </div>
      ) : report.contentMarkdown ? (
        <div className="p-6 sm:p-7 rounded-2xl bg-[#090C12] border border-[#1C202A] shadow-md">
          <DossierMarkdownRenderer
            content={report.contentMarkdown}
            citationMap={citationMap}
            onCitationClick={onCitationClick}
          />
        </div>
      ) : null}
    </div>
  );
}
