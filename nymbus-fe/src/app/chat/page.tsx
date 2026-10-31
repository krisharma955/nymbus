"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronDown,
  FileText,
  Hash,
  Terminal,
  PanelLeftClose,
  PanelLeft,
  Check,
  Paperclip,
  RefreshCw,
  AlertCircle,
  Globe,
  Sparkles,
  X,
} from "lucide-react";

import {
  TaskResponse,
  SubTaskResponse,
  ReportDetailResponse,
  ReportCitationResponse,
  SourceResponse,
  DocumentResponse,
  ExecutionMode,
  WorkflowEventResponse,
} from "@/types/nymbus";
import { api } from "@/lib/api";
import { useWorkflowStream } from "@/hooks/useWorkflowStream";
import { ReportSectionViewer } from "@/components/chat/ReportSectionViewer";
import { SubtaskTimeline } from "@/components/chat/SubtaskTimeline";
import { EvidenceDrawer } from "@/components/chat/EvidenceDrawer";
import { DocumentUploadModal } from "@/components/chat/DocumentUploadModal";
import { SourcesLedger } from "@/components/chat/SourcesLedger";
import { AttachedCorpusViewer } from "@/components/chat/AttachedCorpusViewer";

export default function ChatWorkspacePage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-[#0A0C10]" />}>
      <ChatWorkspaceContent />
    </Suspense>
  );
}

function ChatWorkspaceContent() {
  // Live Backend State
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [activeTask, setActiveTask] = useState<TaskResponse | null>(null);
  const [subtasks, setSubtasks] = useState<SubTaskResponse[]>([]);
  const [activeReport, setActiveReport] = useState<ReportDetailResponse | null>(null);
  const [activeSources, setActiveSources] = useState<SourceResponse[]>([]);
  const [attachedDocs, setAttachedDocs] = useState<DocumentResponse[]>([]);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [docNotification, setDocNotification] = useState<string | null>(null);

  // UI State
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [inquestInput, setInquestInput] = useState<string>("");
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("DEEP_RESEARCH");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [traceExpanded, setTraceExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"report" | "timeline" | "sources" | "documents">("report");
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Modals & Drawers
  const [drawerEvidenceId, setDrawerEvidenceId] = useState<string | null>(null);
  const [drawerCachedCitation, setDrawerCachedCitation] = useState<ReportCitationResponse | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);

    // Read initial query parameter from URL if present
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const initialQuery = params.get("query");
      if (initialQuery) {
        setInquestInput(initialQuery);
      }
    }
  }, []);

  // Fetch real sub-resources (subtasks, sources, reports, documents) for a specific task
  const loadActiveTaskDetails = useCallback(async (taskId: string) => {
    try {
      const [stList, srcList, reports, docs] = await Promise.all([
        api.getSubTasks(taskId).catch(() => []),
        api.getSources(taskId).catch(() => []),
        api.getReports(taskId).catch(() => []),
        api.listDocuments(taskId).catch(() => []),
      ]);

      setSubtasks(stList);
      setActiveSources(srcList);
      setAttachedDocs(docs);

      if (reports && reports.length > 0) {
        const detail = await api.getReportDetail(reports[0].id).catch(() => null);
        setActiveReport(detail);
      } else {
        setActiveReport(null);
      }
    } catch (err: unknown) {
      console.warn("Error loading task sub-resources:", err);
    }
  }, []);

  // Fetch tasks list from live backend
  const refreshTasks = useCallback(async (selectFirstIfNone = false) => {
    try {
      const page = await api.listTasks(0, 50);
      setBackendOnline(true);
      setBackendError(null);
      const fetchedTasks = page.content || [];
      setTasks(fetchedTasks);

      if (selectFirstIfNone && fetchedTasks.length > 0) {
        setActiveTask(fetchedTasks[0]);
        loadActiveTaskDetails(fetchedTasks[0].id);
      }
    } catch (err: unknown) {
      setBackendOnline(false);
      setBackendError(err instanceof Error ? err.message : "Failed to connect to backend");
    }
  }, [loadActiveTaskDetails]);

  // Initial load
  useEffect(() => {
    refreshTasks(true);
  }, [refreshTasks]);

  // Reload task details when activeTask changes
  useEffect(() => {
    if (activeTask?.id) {
      loadActiveTaskDetails(activeTask.id);
      setIsExecuting(
        activeTask.status === "PENDING" ||
          activeTask.status === "PLANNING" ||
          activeTask.status === "RUNNING"
      );
    } else {
      setSubtasks([]);
      setActiveReport(null);
      setActiveSources([]);
      setIsExecuting(false);
    }
  }, [activeTask?.id, loadActiveTaskDetails]);

  // Handle live workflow events from SSE stream
  const handleWorkflowEvent = useCallback(
    (event: WorkflowEventResponse) => {
      if (!activeTask?.id) return;

      // Update subtasks on lifecycle progress
      if (
        event.eventType === "SUBTASK_STARTED" ||
        event.eventType === "SUBTASK_COMPLETED" ||
        event.eventType === "PLAN_CREATED"
      ) {
        api.getSubTasks(activeTask.id).then(setSubtasks).catch(() => {});
      }

      // Update sources when discovered
      if (event.eventType === "SOURCE_FOUND") {
        api.getSources(activeTask.id).then(setActiveSources).catch(() => {});
      }

      // Update documents when uploaded or indexed
      if (
        event.eventType === "DOCUMENT_UPLOADED" ||
        event.eventType === "DOCUMENT_PROCESSED"
      ) {
        api.listDocuments(activeTask.id).then(setAttachedDocs).catch(() => {});
      }

      // Update report when compiled
      if (
        event.eventType === "REPORT_GENERATED" ||
        event.eventType === "TASK_COMPLETED"
      ) {
        loadActiveTaskDetails(activeTask.id);
        setIsExecuting(false);
        setActiveTab("report");
      }
    },
    [activeTask?.id, loadActiveTaskDetails]
  );

  // SSE Stream
  useWorkflowStream({
    taskId: isExecuting ? activeTask?.id || null : null,
    enabled: isExecuting,
    onEvent: handleWorkflowEvent,
    onCompleted: () => {
      setIsExecuting(false);
      if (activeTask?.id) {
        api.getTask(activeTask.id).then(setActiveTask).catch(() => {});
        loadActiveTaskDetails(activeTask.id);
      }
      refreshTasks(false);
    },
    onFailed: () => {
      setIsExecuting(false);
      if (activeTask?.id) {
        api.getTask(activeTask.id).then(setActiveTask).catch(() => {});
      }
      refreshTasks(false);
    },
  });

  // Polling fallback during execution to ensure 100% sync
  useEffect(() => {
    if (!isExecuting || !activeTask?.id) return;

    const interval = setInterval(async () => {
      try {
        const updated = await api.getTask(activeTask.id);
        setActiveTask(updated);
        loadActiveTaskDetails(activeTask.id);
        if (updated.status === "COMPLETED" || updated.status === "FAILED") {
          setIsExecuting(false);
          refreshTasks(false);
        }
      } catch {
        // ignore transient errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isExecuting, activeTask?.id, loadActiveTaskDetails, refreshTasks]);

  // Execute Inquest
  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquestInput.trim() || isExecuting) return;

    const query = inquestInput.trim();
    setInquestInput("");
    setIsExecuting(true);
    setTraceExpanded(true);
    setActiveTab("timeline");

    const title = query.length > 54 ? query.slice(0, 52) + "..." : query;

    try {
      // 1. Create task in backend PostgreSQL
      const newTask = await api.createTask({
        title,
        prompt: query,
        executionMode,
        tokenBudget: 35000,
      });

      // 2. Add to active tasks and select
      setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);
      setActiveTask(newTask);
      setSubtasks([]);
      setActiveReport(null);
      setActiveSources([]);
      setBackendOnline(true);
      setBackendError(null);

      // 3. If files were staged in new chat mode, upload them directly to this new task
      if (stagedFiles.length > 0) {
        const filesToUpload = [...stagedFiles];
        setStagedFiles([]);
        try {
          const uploadedDocs = await Promise.all(
            filesToUpload.map((file) => api.uploadDocument(newTask.id, file))
          );
          setAttachedDocs(uploadedDocs);
          setDocNotification(
            `${uploadedDocs.length} staged document(s) uploaded and indexed into RAG memory.`
          );
          setTimeout(() => setDocNotification(null), 6000);
        } catch (uploadErr) {
          console.warn("Failed to upload some staged files:", uploadErr);
        }
      } else {
        setAttachedDocs([]);
      }

      // 4. Trigger execution in Spring Boot
      await api.executeTask(newTask.id);
    } catch (err: unknown) {
      console.error("Task execution failed:", err);
      setIsExecuting(false);
      setBackendError(err instanceof Error ? err.message : "Execution failed");
    }
  };

  const handleCopyHash = () => {
    if (!activeTask?.id) return;
    navigator.clipboard.writeText(activeTask.id);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCitationClick = (evidenceId: string, citation?: ReportCitationResponse) => {
    setDrawerEvidenceId(evidenceId);
    setDrawerCachedCitation(citation || null);
  };

  const filteredTasks = tasks.filter((t) => {
    const query = searchFilter.toLowerCase();
    return (
      t.title.toLowerCase().includes(query) ||
      t.prompt.toLowerCase().includes(query) ||
      t.id.toLowerCase().includes(query)
    );
  });

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#0A0C10] text-[#F8FAFC] font-sans selection:bg-[#D4A373] selection:text-[#090A0D]">
      
      {/* ========================================================
          LEFT SIDEBAR: INQUEST LEDGER
         ======================================================== */}
      {sidebarOpen ? (
        <aside className="relative z-20 w-80 md:w-84 flex flex-col border-r border-[#1C202A] bg-[#0C0E14] select-none shrink-0 transition-all duration-200">
          
          {/* Masthead Header */}
          <div className="h-14 px-4 flex items-center justify-between border-b border-[#1C202A]">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4A373] shadow-[0_0_8px_#D4A373]" />
              <span className="font-extrabold tracking-wider text-[#F8FAFC] text-sm group-hover:text-white transition-colors">
                NYMBUS
              </span>
            </Link>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => refreshTasks(false)}
                className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161A22] transition-colors cursor-pointer"
                title="Refresh sessions from database"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161A22] transition-colors cursor-pointer"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Action & Search */}
          <div className="p-3.5 border-b border-[#1C202A] space-y-2.5">
            <button
              type="button"
              onClick={() => {
                setActiveTask(null);
                setInquestInput("");
              }}
              className="w-full h-9 px-3 rounded-md bg-[#F8FAFC] hover:bg-[#FFFFFF] text-[#090A0D] text-xs font-semibold tracking-wide flex items-center justify-between transition-colors uppercase cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                New Inquest
              </span>
              <kbd className="px-1.5 py-0.5 rounded bg-[#E2E8F0] text-[#090A0D] text-[10px] font-mono">⌘N</kbd>
            </button>

            {/* Filter Input */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search live inquiries..."
                className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[#11141C] border border-[#1C202A] text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#D4A373] transition-colors"
              />
            </div>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin">
            <div className="px-2 py-1 text-[11px] font-mono text-[#64748B] tracking-wider uppercase flex items-center justify-between">
              <span>Inquest Ledger ({filteredTasks.length})</span>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-[#64748B]">
                No sessions yet. Submit an inquiry to begin.
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isActive = task.id === activeTask?.id;
                const isTaskRunning =
                  task.status === "RUNNING" ||
                  task.status === "PLANNING" ||
                  task.status === "PENDING";

                return (
                  <div
                    key={task.id}
                    onClick={() => {
                      setActiveTask(task);
                      loadActiveTaskDetails(task.id);
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-all border ${
                      isActive
                        ? "bg-[#161B26] border-[#D4A373]/40 text-[#F8FAFC]"
                        : "border-transparent text-[#94A3B8] hover:bg-[#11141C] hover:text-[#E2E8F0]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium text-xs truncate text-[#F8FAFC]">
                        {task.title || "Untitled Inquest"}
                      </span>
                      {task.status === "COMPLETED" && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[#10B981]/15 text-[#10B981] text-[9px] font-semibold shrink-0">
                          VERIFIED
                        </span>
                      )}
                      {isTaskRunning && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[#D4A373]/20 text-[#D4A373] text-[9px] font-semibold shrink-0 animate-pulse">
                          RUNNING
                        </span>
                      )}
                      {task.status === "FAILED" && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-950/40 text-rose-400 text-[9px] font-semibold shrink-0">
                          FAILED
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-[#64748B] line-clamp-1 leading-relaxed">
                      {task.prompt}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Backend Connectivity Info */}
          <div className="h-12 px-4 border-t border-[#1C202A] flex items-center justify-between text-xs text-[#64748B]">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendOnline === true
                    ? "bg-[#10B981]"
                    : backendOnline === false
                    ? "bg-rose-500"
                    : "bg-slate-500"
                }`}
              />
              <span className="text-[#94A3B8] text-[11px] font-mono">
                {backendOnline === true
                  ? "Backend Connected"
                  : backendOnline === false
                  ? "Backend Offline"
                  : "Checking..."}
              </span>
            </div>
            <span className="font-mono text-[10px]">
              {activeTask?.tokensUsed
                ? `${(activeTask.tokensUsed / 1000).toFixed(1)}k tokens`
                : "0 tokens"}
            </span>
          </div>
        </aside>
      ) : null}

      {/* ========================================================
          MAIN WORKSPACE
         ======================================================== */}
      <main className="relative flex-1 flex flex-col h-full overflow-hidden bg-[#0A0C10]">
        
        {/* Sleek Single-Line Masthead */}
        <header className="h-14 px-4 sm:px-8 flex items-center justify-between border-b border-[#1C202A] bg-[#0C0E14]/70 backdrop-blur-md shrink-0">
          
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161A22] transition-colors mr-1 cursor-pointer"
                title="Expand sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
              <span className="text-[#64748B] font-mono truncate max-w-[100px] sm:max-w-[140px]">
                {activeTask?.id ? `${activeTask.id.slice(0, 8)}...` : "NEW"}
              </span>
              <span className="text-[#475569]">/</span>
              <h1 className="text-[#F8FAFC] font-semibold truncate max-w-[240px] sm:max-w-[420px]">
                {activeTask?.title || "Autonomous Multi-Agent Inquest"}
              </h1>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Always accessible Attach RAG Docs button */}
            <button
              type="button"
              onClick={() => setIsDocModalOpen(true)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer border ${
                (activeTask ? attachedDocs.length : stagedFiles.length) > 0
                  ? "text-[#D4A373] bg-[#D4A373]/10 border-[#D4A373]/30 hover:bg-[#D4A373]/20"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161A22] border-[#1C202A]"
              }`}
              title={
                activeTask
                  ? "Attach documents for RAG grounding"
                  : "Attach reference documents to ground your upcoming inquiry"
              }
            >
              <Paperclip className="w-3.5 h-3.5 text-[#D4A373]" />
              <span className="hidden sm:inline">Attach RAG Docs</span>
              {(activeTask ? attachedDocs.length : stagedFiles.length) > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#D4A373] text-[#0A0C10] font-bold text-[10px]">
                  {activeTask ? attachedDocs.length : stagedFiles.length}
                </span>
              )}
            </button>

            {activeTask && (
              <>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#12151D] border border-[#1C202A] text-xs text-[#94A3B8]">
                  <span className="w-2 h-2 rounded-full bg-[#D4A373] shadow-[0_0_8px_#D4A373] animate-pulse" />
                  <span className="hidden sm:inline font-mono text-[11px]">
                    {activeTask.executionMode}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyHash}
                  className="px-2.5 py-1 rounded-md text-xs font-mono text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161A22] border border-[#1C202A] transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Copy Task UUID"
                >
                  {copiedHash ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#10B981]" />
                      <span className="text-[#10B981]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Hash className="w-3.5 h-3.5 text-[#D4A373]" />
                      <span className="hidden sm:inline">UUID</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </header>

        {/* Conversation & Dossier Stream */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 scrollbar-thin">
          <div className="max-w-3xl mx-auto space-y-8">
            
            {backendError && (
              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/50 text-xs text-rose-300 flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{backendError}</span>
              </div>
            )}

            {docNotification && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-mono">{docNotification}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDocNotification(null)}
                  className="p-1 rounded text-emerald-400 hover:text-white hover:bg-emerald-900/50 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {activeTask ? (
              <>
                {/* 1. Researcher Inquest Message */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-[#64748B]">
                    <span className="text-[#94A3B8] font-medium flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-[#D4A373]" />
                      RESEARCHER INQUIRY
                    </span>
                    <span suppressHydrationWarning>
                      {isMounted && activeTask.createdAt
                        ? new Date(activeTask.createdAt).toLocaleTimeString()
                        : ""}
                    </span>
                  </div>
                  <div className="p-5 rounded-xl bg-[#11141C] border border-[#1C202A]">
                    <p className="text-base sm:text-lg text-[#F8FAFC] leading-relaxed font-normal">
                      {activeTask.prompt}
                    </p>
                  </div>
                </div>

                {/* 1.5. Attached Knowledge Corpus Shelf */}
                {attachedDocs.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#0F131C] border border-[#D4A373]/25 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <Paperclip className="w-3.5 h-3.5 text-[#D4A373] shrink-0" />
                      <span className="font-mono text-[11px] text-[#94A3B8] shrink-0">
                        Corpus Linked:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap overflow-hidden">
                        {attachedDocs.map((doc) => {
                          const isReady =
                            doc.processingStatus === "READY" ||
                            doc.processingStatus === "COMPLETED";
                          return (
                            <span
                              key={doc.id}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#161B26] border border-[#1C202A] text-[11px] font-mono text-[#F8FAFC]"
                            >
                              <FileText className="w-3 h-3 text-[#D4A373]" />
                              <span className="truncate max-w-[140px]">{doc.fileName}</span>
                              {isReady ? (
                                <span className="text-emerald-400 font-bold text-[9px]">● READY</span>
                              ) : (
                                <span className="text-[#D4A373] text-[9px] animate-pulse">● INDEXING</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("documents")}
                      className="text-[11px] font-mono text-[#D4A373] hover:underline shrink-0 cursor-pointer"
                    >
                      View All &rarr;
                    </button>
                  </div>
                )}

                {/* 2. Multi-Agent Pipeline Accordion */}
                <div className="rounded-xl border border-[#1C202A] bg-[#0E1118] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setTraceExpanded(!traceExpanded)}
                    className="w-full p-3.5 sm:p-4 flex items-center justify-between text-xs font-mono transition-colors hover:bg-[#121620] cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      {isExecuting ? (
                        <Clock className="w-4 h-4 text-[#D4A373] animate-spin" />
                      ) : activeTask.status === "COMPLETED" ? (
                        <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <span className="font-semibold text-[#F8FAFC]">
                        Autonomous Multi-Agent Pipeline
                      </span>
                      <span className="text-[#64748B]">
                        · {subtasks.filter((s) => s.status === "COMPLETED").length}/{subtasks.length} subtasks
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[#94A3B8]">
                      <span className="text-[11px] text-[#64748B]">
                        {traceExpanded ? "Hide trace" : "View trace"}
                      </span>
                      {traceExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {traceExpanded && (
                    <div className="p-4 pt-2 border-t border-[#1C202A]">
                      <SubtaskTimeline subtasks={subtasks} />
                    </div>
                  )}
                </div>

                {/* 3. Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-[#1C202A] pb-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setActiveTab("report")}
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                      activeTab === "report"
                        ? "bg-[#D4A373]/15 text-[#D4A373] border border-[#D4A373]/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Synthesized Dossier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("sources")}
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                      activeTab === "sources"
                        ? "bg-[#D4A373]/15 text-[#D4A373] border border-[#D4A373]/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Retrieved Sources ({activeSources.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("documents")}
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                      activeTab === "documents"
                        ? "bg-[#D4A373]/15 text-[#D4A373] border border-[#D4A373]/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Attached Corpus ({attachedDocs.length})</span>
                  </button>
                </div>

                {/* 4. Tab Content */}
                {activeTab === "report" && (
                  activeReport ? (
                    <ReportSectionViewer
                      report={activeReport}
                      onCitationClick={handleCitationClick}
                    />
                  ) : isExecuting ? (
                    <div className="p-10 border border-[#1C202A] rounded-xl bg-[#090A0D] text-center space-y-3">
                      <div className="flex items-center justify-center">
                        <Clock className="w-6 h-6 text-[#D4A373] animate-spin" />
                      </div>
                      <h3 className="text-sm font-semibold text-[#F8FAFC]">
                        Agents Are Actively Synthesizing Report...
                      </h3>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Executing web searches, isolating verbatim passages, running NLI entailment gates, and formatting structured sections with citations.
                      </p>
                    </div>
                  ) : (
                    <div className="p-10 border border-[#1C202A] rounded-xl bg-[#090A0D] text-center text-xs text-slate-400 font-mono">
                      No dossier compiled yet for this inquiry.
                    </div>
                  )
                )}

                {activeTab === "sources" && (
                  <SourcesLedger sources={activeSources} />
                )}

                {activeTab === "documents" && (
                  <AttachedCorpusViewer
                    taskId={activeTask.id}
                    documents={attachedDocs}
                    onOpenUpload={() => setIsDocModalOpen(true)}
                  />
                )}
              </>
            ) : (
              /* Clean Ready / Empty State */
              <div className="py-16 text-center space-y-6">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#D4A373]/10 border border-[#D4A373]/30 flex items-center justify-center text-[#D4A373]">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-3 max-w-md mx-auto">
                  <h2 className="text-xl font-bold tracking-tight text-[#F8FAFC]">
                    Autonomous Multi-Agent Inquest
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed font-mono">
                    Enter a scientific, empirical, or complex hypothesis below. The swarm decomposes subtasks, searches Tavily &amp; vector stores, validates verbatim citations, and locks findings to proof.
                  </p>

                  {/* Quick Action to Attach Documents for new chat */}
                  <div className="pt-2 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setIsDocModalOpen(true)}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#141822] hover:bg-[#1C2230] text-[#D4A373] border border-[#D4A373]/30 text-xs font-mono transition-all cursor-pointer shadow-md hover:border-[#D4A373]/60 group"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-[#D4A373] group-hover:rotate-45 transition-transform" />
                      <span>Attach Reference Documents (RAG)</span>
                      {stagedFiles.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[#D4A373] text-[#0A0C10] font-bold text-[10px]">
                          {stagedFiles.length} staged
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ========================================================
            FLOATING COMMAND DOCK
           ======================================================== */}
        <div className="p-4 sm:p-6 bg-gradient-to-t from-[#0A0C10] via-[#0A0C10]/95 to-transparent shrink-0">
          <form onSubmit={handleExecute} className="max-w-3xl mx-auto space-y-2.5">
            
            {/* Staged Documents Shelf for New Inquest */}
            {stagedFiles.length > 0 && (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#121620] border border-[#D4A373]/30 text-xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Paperclip className="w-3.5 h-3.5 text-[#D4A373] shrink-0" />
                  <span className="font-mono text-[11px] text-[#94A3B8] shrink-0">
                    Staged for Inquest ({stagedFiles.length}):
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap overflow-hidden">
                    {stagedFiles.map((file, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#161B26] border border-[#1C202A] text-[11px] font-mono text-[#F8FAFC]"
                      >
                        <FileText className="w-3 h-3 text-[#D4A373]" />
                        <span className="truncate max-w-[130px]">{file.name}</span>
                        <span className="text-[10px] text-slate-500">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={() => setStagedFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-slate-500 hover:text-rose-400 font-bold ml-1 cursor-pointer"
                          title="Remove file"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(true)}
                  className="text-[11px] font-mono text-[#D4A373] hover:underline shrink-0 cursor-pointer"
                >
                  Add More +
                </button>
              </div>
            )}

            {/* Input Bar */}
            <div className="relative flex items-center bg-[#11141C] border border-[#1C202A] rounded-xl focus-within:border-[#D4A373] focus-within:ring-2 focus-within:ring-[#D4A373]/20 transition-all shadow-xl">
              <div className="pl-4 pr-1 text-[#D4A373] flex items-center gap-1">
                <Terminal className="w-4 h-4" />
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(true)}
                  className="p-1 rounded text-[#94A3B8] hover:text-[#D4A373] hover:bg-white/5 transition-colors cursor-pointer"
                  title="Attach document(s) for RAG context"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
              </div>

              <input
                type="text"
                value={inquestInput}
                onChange={(e) => setInquestInput(e.target.value)}
                placeholder="Ask an empirical research question or request proof..."
                disabled={isExecuting}
                className="w-full py-3.5 pr-32 bg-transparent text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none font-sans"
              />

              {/* Execution Mode Dropdown / Button */}
              <div className="absolute right-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setExecutionMode(
                      executionMode === "DEEP_RESEARCH" ? "STANDARD" : "DEEP_RESEARCH"
                    )
                  }
                  className="px-2 py-1 rounded text-[10px] font-mono border border-[#1C202A] text-slate-400 hover:text-[#D4A373] hover:border-[#D4A373]/40 transition-colors hidden sm:block cursor-pointer"
                  title="Toggle Execution Mode"
                >
                  {executionMode}
                </button>

                <button
                  type="submit"
                  disabled={isExecuting || !inquestInput.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#FFFFFF] disabled:bg-[#1C202A] disabled:text-[#64748B] text-[#090A0D] font-mono text-xs font-bold transition-all flex items-center gap-1.5 uppercase cursor-pointer"
                >
                  {isExecuting ? (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>In-Flight</span>
                    </>
                  ) : (
                    <>
                      <span>Execute</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Presets Row */}
            <div className="flex items-center gap-2 overflow-x-auto text-xs text-[#64748B]">
              <span className="text-[11px] font-mono shrink-0">Try:</span>
              <button
                type="button"
                onClick={() =>
                  setInquestInput("Verify critical current density scaling in YBCO tapes under 15T background field.")
                }
                className="px-2.5 py-0.5 rounded-full bg-[#141822] hover:bg-[#1C2230] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1C202A] whitespace-nowrap transition-colors cursor-pointer"
              >
                YBCO Jc Scaling
              </button>
              <button
                type="button"
                onClick={() =>
                  setInquestInput("Check off-target Cas12a trans-cleavage rates across human non-coding introns.")
                }
                className="px-2.5 py-0.5 rounded-full bg-[#141822] hover:bg-[#1C2230] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1C202A] whitespace-nowrap transition-colors cursor-pointer"
              >
                Cas12a Introns
              </button>
              <button
                type="button"
                onClick={() =>
                  setInquestInput("Validate Helium-3 lunar pyroxene abundance vs volcanic basalt extraction yields.")
                }
                className="px-2.5 py-0.5 rounded-full bg-[#141822] hover:bg-[#1C2230] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1C202A] whitespace-nowrap transition-colors cursor-pointer"
              >
                He-3 Regolith
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* ========================================================
          SLIDE-OUT EVIDENCE & SOURCE PASSAGE DRAWER
         ======================================================== */}
      <EvidenceDrawer
        evidenceId={drawerEvidenceId}
        cachedCitation={drawerCachedCitation}
        onClose={() => {
          setDrawerEvidenceId(null);
          setDrawerCachedCitation(null);
        }}
      />

      {/* ========================================================
          DOCUMENT UPLOAD MODAL (RAG)
         ======================================================== */}
      <DocumentUploadModal
        taskId={activeTask?.id || null}
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        stagedFiles={stagedFiles}
        onStageFiles={(files) => setStagedFiles((prev) => [...prev, ...files])}
        onRemoveStagedFile={(idx) => setStagedFiles((prev) => prev.filter((_, i) => i !== idx))}
        onUploaded={(doc) => {
          setAttachedDocs((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
          setDocNotification(
            `Document "${doc.fileName}" attached and indexed for this inquest. Agent reasoning will query it.`
          );
          setActiveTab("documents");
          if (activeTask?.id) {
            api.getSources(activeTask.id).then(setActiveSources).catch(() => {});
          }
          setTimeout(() => setDocNotification(null), 6000);
        }}
      />

    </div>
  );
}
