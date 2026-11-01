"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  ChevronDown,
  ChevronRight,
  Loader2,
  ListTree,
  Radio,
} from "lucide-react";
import {
  ConversationMessageResponse,
  ReportCitationResponse,
  ReportDetailResponse,
  CitationDto,
  SourceType,
  SubTaskResponse,
  WorkflowEventResponse,
} from "@/types/nymbus";
import { api } from "@/lib/api";
import { useWorkflowStream } from "@/hooks/useWorkflowStream";
import { DossierMarkdownRenderer } from "./DossierMarkdownRenderer";
import { SubtaskTimeline } from "./SubtaskTimeline";

const EVENT_BADGES: Record<string, { label: string; color: string }> = {
  TASK_STARTED: { label: "INIT", color: "bg-purple-950/40 text-purple-300 border-purple-800/50" },
  PLAN_CREATED: { label: "PLAN", color: "bg-indigo-950/40 text-indigo-300 border-indigo-800/50" },
  SUBTASK_STARTED: { label: "SUBTASK START", color: "bg-sky-950/40 text-sky-300 border-sky-800/50" },
  SUBTASK_COMPLETED: { label: "SUBTASK DONE", color: "bg-emerald-950/40 text-emerald-300 border-emerald-800/50" },
  SOURCE_FOUND: { label: "SOURCE FOUND", color: "bg-amber-950/40 text-amber-300 border-amber-800/50" },
  CLAIM_EXTRACTED: { label: "CLAIM EXTRACTED", color: "bg-blue-950/40 text-blue-300 border-blue-800/50" },
  CLAIM_VERIFIED: { label: "VERIFIED", color: "bg-teal-950/40 text-teal-300 border-teal-800/50" },
  CLAIM_REJECTED: { label: "REJECTED", color: "bg-rose-950/40 text-rose-300 border-rose-800/50" },
  RE_RESEARCH_TRIGGERED: { label: "RE-RESEARCH", color: "bg-orange-950/40 text-orange-300 border-orange-800/50" },
  ANALYSIS_COMPLETED: { label: "SYNTHESIS", color: "bg-cyan-950/40 text-cyan-300 border-cyan-800/50" },
  REPORT_GENERATED: { label: "REPORT READY", color: "bg-[#D4A373]/20 text-[#D4A373] border-[#D4A373]/40" },
  TASK_COMPLETED: { label: "COMPLETED", color: "bg-emerald-950/50 text-emerald-300 border-emerald-700/50" },
  TASK_FAILED: { label: "FAILED", color: "bg-rose-950/50 text-rose-300 border-rose-700/50" },
};

interface DeepResearchWidgetProps {
  researchTaskId: string;
  researchStatus?: string;
  researchNote?: string;
  reportId?: string;
  reportDetailsMap?: Record<string, ReportDetailResponse>;
  onViewReport: (reportId: string, taskId?: string) => void;
}

function DeepResearchWidget({
  researchTaskId,
  researchStatus,
  researchNote,
  reportId,
  reportDetailsMap = {},
  onViewReport,
}: DeepResearchWidgetProps) {
  const [subtasks, setSubtasks] = useState<SubTaskResponse[]>([]);
  const [events, setEvents] = useState<WorkflowEventResponse[]>([]);
  const [latestEvent, setLatestEvent] = useState<WorkflowEventResponse | null>(null);
  const [traceExpanded, setTraceExpanded] = useState<boolean>(() => {
    return (
      researchStatus === "RUNNING" ||
      researchStatus === "PLANNING" ||
      researchStatus === "RESEARCHING" ||
      researchStatus === "PENDING"
    );
  });
  const [activeTab, setActiveTab] = useState<"dag" | "events">("dag");
  const [isLoadingSubtasks, setIsLoadingSubtasks] = useState<boolean>(false);

  const isRunning =
    researchStatus === "RUNNING" ||
    researchStatus === "PLANNING" ||
    researchStatus === "RESEARCHING" ||
    researchStatus === "PENDING";

  const refreshSubtasks = useCallback(() => {
    if (!researchTaskId) return;
    api.getSubTasks(researchTaskId)
      .then((res) => {
        if (res && Array.isArray(res)) {
          setSubtasks(res);
        }
      })
      .catch(() => {});
  }, [researchTaskId]);

  const handleWorkflowEvent = useCallback(
    (evt: WorkflowEventResponse) => {
      setLatestEvent(evt);
      setEvents((prev) => {
        if (prev.some((e) => e.id === evt.id)) return prev;
        return [...prev, evt];
      });

      if (
        evt.eventType === "PLAN_CREATED" ||
        evt.eventType === "SUBTASK_STARTED" ||
        evt.eventType === "SUBTASK_COMPLETED" ||
        evt.eventType === "TASK_COMPLETED" ||
        evt.eventType === "RE_RESEARCH_TRIGGERED"
      ) {
        refreshSubtasks();
      }
    },
    [refreshSubtasks]
  );

  // Live SSE Workflow stream
  useWorkflowStream({
    taskId: researchTaskId,
    enabled: isRunning,
    onEvent: handleWorkflowEvent,
    onCompleted: () => {
      refreshSubtasks();
    },
    onFailed: () => {
      refreshSubtasks();
    },
  });

  // Initial fetch and synchronization interval
  useEffect(() => {
    let isMounted = true;
    setIsLoadingSubtasks(true);

    api.getSubTasks(researchTaskId)
      .then((res) => {
        if (isMounted && res && Array.isArray(res)) {
          setSubtasks(res);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingSubtasks(false);
      });

    api.getWorkflowEvents(researchTaskId)
      .then((evts) => {
        if (isMounted && evts && evts.length > 0) {
          setEvents(evts);
          setLatestEvent(evts[evts.length - 1]);
        }
      })
      .catch(() => {});

    let intervalId: NodeJS.Timeout | null = null;
    if (isRunning) {
      intervalId = setInterval(() => {
        api.getSubTasks(researchTaskId)
          .then((res) => {
            if (isMounted && res && Array.isArray(res)) {
              setSubtasks(res);
            }
          })
          .catch(() => {});
      }, 3500);
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [researchTaskId, isRunning]);

  const toggleTrace = () => {
    const next = !traceExpanded;
    setTraceExpanded(next);
    if (next && subtasks.length === 0) {
      setIsLoadingSubtasks(true);
      refreshSubtasks();
      api.getWorkflowEvents(researchTaskId)
        .then((evts) => {
          if (evts && evts.length > 0) {
            setEvents(evts);
            setLatestEvent(evts[evts.length - 1]);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingSubtasks(false));
    }
  };

  const completedCount = subtasks.filter((s) => s.status === "COMPLETED").length;
  const currentRunningSubtask = subtasks.find((s) => s.status === "IN_PROGRESS" || s.status === "ASSIGNED");

  return (
    <div className="pt-3 border-t border-[#1C202A] space-y-3">
      <div className="rounded-xl bg-gradient-to-r from-[#11151F] to-[#0D1017] border border-[#D4A373]/30 overflow-hidden shadow-xl">
        {/* Header Bar */}
        <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
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
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${
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
                  ? "Autonomous multi-agent swarm is executing topological subtasks across web & corpus..."
                  : researchStatus === "PLANNING"
                  ? "Planning topological execution graph and subtask decomposition..."
                  : researchStatus === "FAILED"
                  ? "Research could not be completed."
                  : researchNote || "Research task has been queued for autonomous background execution."}
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

        {/* Live Swarm Activity Ticker */}
        {(latestEvent || isRunning || currentRunningSubtask) && (
          <div className="px-4 py-2.5 bg-[#090C12]/90 border-t border-[#1C202A] flex items-center gap-2.5 text-xs font-mono text-[#D4A373]">
            <span className="w-2 h-2 rounded-full bg-[#D4A373] animate-pulse shrink-0 shadow-[0_0_6px_#D4A373]" />
            <span className="text-[11px] text-slate-400 shrink-0 font-medium uppercase tracking-wider">
              Agent Activity:
            </span>
            <span className="text-[11px] text-slate-200 truncate font-mono">
              {latestEvent?.message ||
                (currentRunningSubtask
                  ? `Executing: ${currentRunningSubtask.title}`
                  : "Orchestrating autonomous multi-agent pipeline...")}
            </span>
          </div>
        )}

        {/* Multi-Agent Pipeline Trace Accordion Header */}
        <div className="border-t border-[#1C202A] bg-[#0C0F16]">
          <div className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-mono flex-wrap">
            <button
              type="button"
              onClick={toggleTrace}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors cursor-pointer group"
            >
              {traceExpanded ? (
                <ChevronDown className="w-4 h-4 text-[#D4A373] transition-transform" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#D4A373] transition-transform" />
              )}
              <span className="font-semibold text-slate-200 group-hover:text-white">
                Autonomous Multi-Agent Pipeline
              </span>
              <span className="text-slate-500">
                · {completedCount}/{subtasks.length || "..."} subtasks
              </span>
              <span className="text-[10px] text-[#D4A373] ml-1">
                {traceExpanded ? "[Hide trace]" : "[View trace]"}
              </span>
            </button>

            {/* View Switchers (DAG vs Events) */}
            {traceExpanded && (
              <div className="flex items-center gap-1 bg-[#131722] p-0.5 rounded-lg border border-[#1C202A]">
                <button
                  type="button"
                  onClick={() => setActiveTab("dag")}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors flex items-center gap-1 cursor-pointer ${
                    activeTab === "dag"
                      ? "bg-[#D4A373]/20 text-[#D4A373] font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <ListTree className="w-3 h-3" />
                  <span>Subtask DAG ({subtasks.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("events")}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors flex items-center gap-1 cursor-pointer ${
                    activeTab === "events"
                      ? "bg-[#D4A373]/20 text-[#D4A373] font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Radio className="w-3 h-3" />
                  <span>Live Events ({events.length})</span>
                </button>
              </div>
            )}
          </div>

          {/* Trace Content Body */}
          {traceExpanded && (
            <div className="p-4 pt-2 border-t border-[#1C202A] bg-[#080A0F]">
              {isLoadingSubtasks && subtasks.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 text-[#D4A373] animate-spin" />
                  <span>Loading multi-agent execution DAG and events...</span>
                </div>
              ) : activeTab === "dag" ? (
                <SubtaskTimeline subtasks={subtasks} />
              ) : (
                /* Live Events Log Feed */
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1 font-mono text-xs">
                  {events.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      No multi-agent events logged yet. Events will appear as agents execute tasks.
                    </div>
                  ) : (
                    events.map((evt) => {
                      const badge = EVENT_BADGES[evt.eventType] || {
                        label: evt.eventType,
                        color: "bg-slate-800 text-slate-300 border-slate-700",
                      };
                      return (
                        <div
                          key={evt.id}
                          className="p-2.5 rounded-lg bg-[#0C0F16] border border-[#1C202A] flex flex-col gap-1 hover:border-[#2C3344] transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badge.color}`}
                              >
                                {badge.label}
                              </span>
                              <span className="text-slate-200 text-xs font-normal">
                                {evt.message}
                              </span>
                            </div>
                            <span
                              suppressHydrationWarning
                              className="text-[10px] text-slate-500 shrink-0"
                            >
                              {evt.createdAt
                                ? new Date(evt.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })
                                : ""}
                            </span>
                          </div>
                          {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                            <div className="text-[11px] text-slate-400 pl-2 border-l border-[#1C202A] flex flex-wrap gap-x-3 gap-y-1">
                              {Boolean(evt.metadata.url) && (
                                <span className="text-sky-400 truncate max-w-sm">
                                  {String(evt.metadata.url)}
                                </span>
                              )}
                              {Boolean(evt.metadata.confidence) && (
                                <span className="text-teal-400">
                                  Confidence: {Math.round(Number(evt.metadata.confidence) * 100)}%
                                </span>
                              )}
                              {Boolean(evt.metadata.subtaskCount) && (
                                <span className="text-purple-400">
                                  Subtasks: {String(evt.metadata.subtaskCount)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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

        {/* Autonomous Deep Research Status & Multi-Agent DAG Widget */}
        {researchTaskId ? (
          <DeepResearchWidget
            researchTaskId={researchTaskId}
            researchStatus={researchStatus}
            researchNote={researchNote}
            reportId={reportId}
            reportDetailsMap={reportDetailsMap}
            onViewReport={onViewReport}
          />
        ) : researchStatus ? (
          <div className="pt-3 border-t border-[#1C202A]">
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#11151F] to-[#0D1017] border border-[#D4A373]/30 flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#D4A373]/10 border border-[#D4A373]/30 flex items-center justify-center text-[#D4A373]">
                <Clock className="w-4 h-4 animate-spin" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#F8FAFC] flex items-center gap-2">
                  <span>Autonomous Deep Research</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-[#D4A373]/15 text-[#D4A373] border border-[#D4A373]/30 animate-pulse">
                    {researchStatus}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {researchNote || "Deep research task queued. Orchestrator initializing..."}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
