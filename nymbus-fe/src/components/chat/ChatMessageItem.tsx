"use client";

import React, { useState, useMemo } from "react";
import {
  Terminal,
  Sparkles,
  Paperclip,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  FileText,
  ArrowRight,
  Globe,
} from "lucide-react";
import {
  ConversationMessageResponse,
  ReportCitationResponse,
  ReportDetailResponse,
  CitationDto,
  SourceType,
} from "@/types/nymbus";
import { DossierMarkdownRenderer } from "./DossierMarkdownRenderer";

interface ChatMessageItemProps {
  message: ConversationMessageResponse;
  isStreaming?: boolean;
  onCitationClick: (evidenceId: string, citation?: ReportCitationResponse) => void;
  onViewReport: (reportId: string, taskId?: string) => void;
  onRetry?: (content: string) => void;
  reportDetailsMap?: Record<string, ReportDetailResponse>;
}

export function ChatMessageItem({
  message,
  isStreaming = false,
  onCitationClick,
  onViewReport,
  onRetry,
  reportDetailsMap = {},
}: ChatMessageItemProps) {
  const [copied, setCopied] = useState(false);

  const isUser = message.role === "USER";

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const researchMeta = message.metadata?.research;
  const researchTaskId = message.researchTaskId || (researchMeta?.taskId as string | undefined);
  const researchStatus = (researchMeta?.status as string | undefined) || (message.status === "RESEARCHING" ? "RUNNING" : undefined);
  const researchNote = researchMeta?.note as string | undefined;
  const reportId = researchMeta?.reportId as string | undefined;

  // Citations from metadata
  const citations = useMemo(
    () => (message.metadata?.citations as CitationDto[] | undefined) || [],
    [message.metadata?.citations]
  );

  // Build citation map for markdown renderer
  const citationMap = useMemo(() => {
    const map = new Map<string, ReportCitationResponse>();

    // Map citations from report if available
    if (researchTaskId && reportDetailsMap[researchTaskId]) {
      const rep = reportDetailsMap[researchTaskId];
      rep.sections?.forEach((sec) => {
        sec.citations?.forEach((cit) => {
          map.set(cit.citationLabel, cit);
        });
      });
    }

    // Also map normal chat citations
    citations.forEach((c) => {
      const key = `[${c.id}]`;
      const sType: SourceType =
        c.sourceType === "DOCUMENT" || c.sourceType === "USER_UPLOAD" ? c.sourceType : "WEB";

      map.set(key, {
        id: c.id,
        citationLabel: key,
        evidenceId: c.id,
        claim: c.title,
        supportingPassage: c.excerpt,
        verificationStatus: "VERIFIED",
        confidenceScore: 0.95,
        sources: [
          {
            sourceId: c.id,
            title: c.title,
            url: c.url,
            domain: c.url ? new URL(c.url).hostname : undefined,
            sourceType: sType,
          },
        ],
      });
    });

    return map;
  }, [citations, researchTaskId, reportDetailsMap]);

  if (isUser) {
    const documentIds = (message.metadata?.documentIds as string[] | undefined) || [];
    const isDeepResearch = Boolean(message.metadata?.deepResearch);

    return (
      <div className="space-y-2 group">
        <div className="flex items-center justify-between text-xs font-mono text-[#64748B]">
          <span className="text-[#94A3B8] font-medium flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-[#D4A373]" />
            RESEARCHER INQUIRY
          </span>
          <span suppressHydrationWarning>
            {message.createdAt
              ? new Date(message.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-[#11141C] border border-[#1C202A] text-[#F8FAFC]">
          <p className="text-sm sm:text-base leading-relaxed font-normal whitespace-pre-wrap">
            {message.content}
          </p>

          {(documentIds.length > 0 || isDeepResearch) && (
            <div className="mt-3 pt-3 border-t border-[#1C202A]/80 flex flex-wrap items-center gap-2">
              {isDeepResearch && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#D4A373]/15 border border-[#D4A373]/30 text-[#D4A373] text-[10px] font-mono font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4A373] animate-pulse" />
                  DEEP RESEARCH
                </span>
              )}
              {documentIds.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#161B26] border border-[#1C202A] text-slate-300 text-[10px] font-mono">
                  <Paperclip className="w-3 h-3 text-[#D4A373]" />
                  {documentIds.length} Attached Document{documentIds.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Assistant Message
  return (
    <div className="space-y-3 group">
      {/* Header */}
      <div className="flex items-center justify-between text-xs font-mono text-[#64748B]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#D4A373] shadow-[0_0_8px_#D4A373]" />
          <span className="text-[#F8FAFC] font-semibold tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D4A373]" />
            Nymbus Intelligence
          </span>
          {isStreaming && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[#D4A373] font-mono animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4A373]" />
              Generating
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Copy response markdown"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <span suppressHydrationWarning className="text-[11px] text-slate-500">
            {message.createdAt
              ? new Date(message.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
          </span>
        </div>
      </div>

      {/* Message Content Container */}
      <div className="p-5 rounded-xl bg-[#0C0E14] border border-[#1C202A] space-y-4">
        {/* Render markdown content */}
        {message.content ? (
          <div className="text-sm leading-relaxed text-[#E2E8F0] space-y-3">
            <DossierMarkdownRenderer
              content={message.content}
              citationMap={citationMap}
              onCitationClick={onCitationClick}
            />
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 ml-1 bg-[#D4A373] animate-pulse align-middle" />
            )}
          </div>
        ) : isStreaming ? (
          <div className="flex items-center gap-2 text-xs font-mono text-[#D4A373] py-2">
            <Clock className="w-4 h-4 animate-spin" />
            <span>Analyzing corpus and assembling synthesis...</span>
          </div>
        ) : message.status === "FAILED" ? (
          <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-900/50 text-xs text-rose-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Failed to generate complete response.</span>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={() => onRetry(message.content)}
                className="px-2.5 py-1 rounded bg-rose-900/40 hover:bg-rose-900/60 text-rose-200 text-xs font-mono transition-colors cursor-pointer"
              >
                Retry
              </button>
            )}
          </div>
        ) : null}

        {/* Citations Shelf */}
        {citations.length > 0 && (
          <div className="pt-3 border-t border-[#1C202A] space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
              <Globe className="w-3.5 h-3.5 text-[#D4A373]" />
              <span>Sources Referenced ({citations.length}):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {citations.map((c) => (
                <a
                  key={c.id}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-[#11141C] border border-[#1C202A] hover:border-[#D4A373]/40 transition-colors flex items-start justify-between gap-2 text-xs group/link"
                >
                  <div className="overflow-hidden">
                    <div className="font-medium text-slate-200 truncate group-hover/link:text-[#D4A373] transition-colors">
                      <span className="font-mono text-[#D4A373] mr-1.5">[{c.id}]</span>
                      {c.title || c.url}
                    </div>
                    {c.excerpt && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {c.excerpt}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover/link:text-[#D4A373] shrink-0 mt-0.5" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Autonomous Deep Research Status Widget */}
        {(researchTaskId || researchStatus) && (
          <div className="pt-3 border-t border-[#1C202A]">
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#11151F] to-[#0D1017] border border-[#D4A373]/30 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {researchStatus === "COMPLETED" ? (
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : researchStatus === "FAILED" ? (
                    <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-[#D4A373]/10 border border-[#D4A373]/30 flex items-center justify-center text-[#D4A373]">
                      <Clock className="w-4 h-4 animate-spin" />
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-semibold text-[#F8FAFC] flex items-center gap-2">
                      <span>Autonomous Deep Research</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono uppercase ${
                          researchStatus === "COMPLETED"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : researchStatus === "FAILED"
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            : "bg-[#D4A373]/15 text-[#D4A373] border border-[#D4A373]/30 animate-pulse"
                        }`}
                      >
                        {researchStatus || "PENDING"}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {researchStatus === "COMPLETED"
                        ? "Comprehensive evidence synthesis and verified research report generated."
                        : researchStatus === "RUNNING" || researchStatus === "RESEARCHING"
                        ? "Autonomous multi-agent swarm is investigating your topic across web & corpus..."
                        : researchStatus === "PLANNING"
                        ? "Planning topological execution graph and research subtasks..."
                        : researchStatus === "FAILED"
                        ? "Research could not be completed."
                        : researchNote || "Research task has been queued for background execution."}
                    </p>
                  </div>
                </div>

                {/* View Full Research Report Action Button */}
                {(researchStatus === "COMPLETED" || reportId || (researchTaskId && reportDetailsMap[researchTaskId])) && (
                  <button
                    type="button"
                    onClick={() => {
                      const rep = researchTaskId ? reportDetailsMap[researchTaskId] : null;
                      const targetReportId = reportId || rep?.id || researchTaskId;
                      if (targetReportId) {
                        onViewReport(targetReportId, researchTaskId);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#D4A373] hover:bg-[#E5B584] text-[#0A0C10] text-xs font-mono font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-lg cursor-pointer hover:scale-[1.02]"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Full Report</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
