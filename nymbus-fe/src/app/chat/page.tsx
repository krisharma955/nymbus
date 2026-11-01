"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  CheckCircle2,
  PanelLeftClose,
  PanelLeft,
  Paperclip,
  RefreshCw,
  AlertCircle,
  X,
  Trash2,
  Edit2,
  Send,
  Loader2,
  Sparkles,
  Terminal,
  FileText,
} from "lucide-react";

import {
  ConversationResponse,
  DocumentResponse,
  ReportDetailResponse,
  ReportCitationResponse,
  ExecutionMode,
  UserMeResponse,
} from "@/types/nymbus";
import { api } from "@/lib/api";
import { initializeAuthFromUrl } from "@/lib/auth";
import { useConversationChat } from "@/hooks/useConversationChat";
import { useResearchTask } from "@/hooks/useResearchTask";
import { ChatMessageItem } from "@/components/chat/ChatMessageItem";
import { DocumentUploadModal } from "@/components/chat/DocumentUploadModal";
import { EvidenceDrawer } from "@/components/chat/EvidenceDrawer";
import { ResearchReportModal } from "@/components/chat/ResearchReportModal";

const emptySubscribe = () => () => {};

export default function ChatWorkspacePage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-[#0A0C10]" />}>
      <ChatWorkspaceContent />
    </Suspense>
  );
}

function ChatWorkspaceContent() {
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  // --------------------------------------------------------------------------
  // User & Authentication State
  // --------------------------------------------------------------------------
  const [currentUser, setCurrentUser] = useState<UserMeResponse | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Conversation Management State
  // --------------------------------------------------------------------------
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationResponse | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<string>("");

  // --------------------------------------------------------------------------
  // Document Intelligence (RAG) State
  // --------------------------------------------------------------------------
  const [conversationDocs, setConversationDocs] = useState<DocumentResponse[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [docNotification, setDocNotification] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Chat Input & Execution State
  // --------------------------------------------------------------------------
  const [chatInput, setChatInput] = useState<string>("");
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("STANDARD");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // --------------------------------------------------------------------------
  // Autonomous Deep Research & Reports State
  // --------------------------------------------------------------------------
  const [activeResearchTaskId, setActiveResearchTaskId] = useState<string | null>(null);
  const [reportsMap, setReportsMap] = useState<Record<string, ReportDetailResponse>>({});
  const [selectedReportForModal, setSelectedReportForModal] = useState<ReportDetailResponse | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // Evidence Drawer State
  // --------------------------------------------------------------------------
  const [drawerEvidenceId, setDrawerEvidenceId] = useState<string | null>(null);
  const [drawerCachedCitation, setDrawerCachedCitation] = useState<ReportCitationResponse | null>(null);

  // Scroll Container Ref
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isAutoScrollEnabledRef = useRef<boolean>(true);

  // --------------------------------------------------------------------------
  // Conversations API Loader
  // --------------------------------------------------------------------------
  const loadConversations = useCallback(async (selectFirst = false) => {
    try {
      const page = await api.listConversations(0, 50);
      const fetched = page.content || [];
      setConversations(fetched);
      setBackendOnline(true);
      setBackendError(null);

      if (selectFirst && fetched.length > 0 && !activeConversation) {
        setActiveConversation(fetched[0]);
      }
    } catch (err: unknown) {
      setBackendOnline(false);
      setBackendError(err instanceof Error ? err.message : "Failed to connect to backend");
    }
  }, [activeConversation]);

  // Load conversation documents & research tasks when conversation changes
  const loadConversationAuxiliary = useCallback(async (convId: string) => {
    try {
      const [docs, researchTasks] = await Promise.all([
        api.listConversationDocuments(convId).catch(() => []),
        api.listConversationResearchTasks(convId).catch(() => []),
      ]);

      setConversationDocs(docs);

      if (researchTasks && researchTasks.length > 0) {
        const runningTask = researchTasks.find(
          (t) => t.status === "RUNNING" || t.status === "PLANNING" || t.status === "PENDING"
        );

        if (runningTask) {
          setActiveResearchTaskId(runningTask.taskId);
        } else {
          const completedTask = researchTasks.find((t) => t.status === "COMPLETED" && t.reportId);
          if (completedTask?.reportId) {
            api.getReportDetail(completedTask.reportId).then((rep) => {
              setReportsMap((prev) => ({ ...prev, [completedTask.taskId]: rep }));
            }).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.warn("Failed to load auxiliary conversation data:", err);
    }
  }, []);

  // --------------------------------------------------------------------------
  // Chat Streaming Hook
  // --------------------------------------------------------------------------
  const {
    messages,
    setMessages,
    isLoadingHistory,
    isStreaming,
    isDocumentProcessing,
    activeResearchTaskId: chatHookTaskId,
    streamError,
    loadMessages,
    sendMessage: executeSendMessage,
    cancelStream,
  } = useConversationChat({
    conversationId: activeConversation?.id || null,
    onResearchQueued: (taskId) => {
      setActiveResearchTaskId(taskId);
    },
    onConversationUpdated: () => {
      loadConversations(false);
    },
  });

  // Keep activeResearchTaskId in sync with chat hook
  useEffect(() => {
    if (chatHookTaskId) {
      setActiveResearchTaskId(chatHookTaskId);
    }
  }, [chatHookTaskId]);

  // --------------------------------------------------------------------------
  // Autonomous Research Task Polling Hook
  // --------------------------------------------------------------------------
  useResearchTask({
    conversationId: activeConversation?.id || null,
    taskId: activeResearchTaskId,
    enabled: Boolean(activeConversation?.id && activeResearchTaskId),
    pollIntervalMs: 3000,
    onStatusChange: (taskStatus) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (
            msg.researchTaskId === taskStatus.taskId ||
            msg.metadata?.research?.taskId === taskStatus.taskId
          ) {
            return {
              ...msg,
              status: taskStatus.status === "COMPLETED" ? "COMPLETED" : msg.status,
              metadata: {
                ...msg.metadata,
                research: {
                  ...(msg.metadata?.research || {}),
                  taskId: taskStatus.taskId,
                  status: taskStatus.status,
                  reportId: taskStatus.reportId || msg.metadata?.research?.reportId,
                },
              },
            };
          }
          return msg;
        })
      );
    },
    onCompleted: (taskStatus, report) => {
      if (report) {
        setReportsMap((prev) => ({ ...prev, [taskStatus.taskId]: report }));
        setDocNotification(`Research Report ready: "${report.title}"`);
        setTimeout(() => setDocNotification(null), 8000);
      }
      setMessages((prev) =>
        prev.map((msg) => {
          if (
            msg.researchTaskId === taskStatus.taskId ||
            msg.metadata?.research?.taskId === taskStatus.taskId
          ) {
            return {
              ...msg,
              status: "COMPLETED",
              metadata: {
                ...msg.metadata,
                research: {
                  ...(msg.metadata?.research || {}),
                  taskId: taskStatus.taskId,
                  status: "COMPLETED",
                  reportId: taskStatus.reportId || msg.metadata?.research?.reportId,
                },
              },
            };
          }
          return msg;
        })
      );
    },
    onFailed: (taskStatus, errorMsg) => {
      setBackendError(`Research task failed: ${errorMsg}`);
      setMessages((prev) =>
        prev.map((msg) => {
          if (
            msg.researchTaskId === taskStatus.taskId ||
            msg.metadata?.research?.taskId === taskStatus.taskId
          ) {
            return {
              ...msg,
              metadata: {
                ...msg.metadata,
                research: {
                  ...(msg.metadata?.research || {}),
                  taskId: taskStatus.taskId,
                  status: "FAILED",
                },
              },
            };
          }
          return msg;
        })
      );
    },
  });

  // Initial Mount
  useEffect(() => {
    initializeAuthFromUrl();

    api.getCurrentUser()
      .then((user) => {
        setCurrentUser(user);
        setBackendOnline(true);
      })
      .catch((err) => {
        console.warn("Could not fetch user /me:", err);
      });

    loadConversations(true);
  }, [loadConversations]);

  // When active conversation changes, load messages and docs
  useEffect(() => {
    const convId = activeConversation?.id;
    if (convId) {
      loadMessages(convId);
      loadConversationAuxiliary(convId);
    }
  }, [activeConversation?.id, loadMessages, loadConversationAuxiliary]);

  // Auto-scroll logic
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    isAutoScrollEnabledRef.current = scrollHeight - scrollTop - clientHeight < 80;
  };

  useEffect(() => {
    if (isAutoScrollEnabledRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  // --------------------------------------------------------------------------
  // Conversation CRUD Operations
  // --------------------------------------------------------------------------
  const handleCreateConversation = async () => {
    cancelStream();
    try {
      const newConv = await api.createConversation({ title: "New Conversation" });
      setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)]);
      setActiveConversation(newConv);
      setSelectedDocIds([]);
      setStagedFiles([]);
      setChatInput("");
    } catch (err: unknown) {
      console.error("Failed to create conversation:", err);
      setBackendError(err instanceof Error ? err.message : "Failed to create conversation");
    }
  };

  const handleUpdateTitle = async (convId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      setEditingTitleId(null);
      return;
    }
    try {
      const updated = await api.updateConversation(convId, { title: newTitle.trim() });
      setConversations((prev) => prev.map((c) => (c.id === convId ? updated : c)));
      if (activeConversation?.id === convId) {
        setActiveConversation(updated);
      }
    } catch (err) {
      console.error("Failed to update conversation title:", err);
    } finally {
      setEditingTitleId(null);
    }
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this conversation?")) return;

    cancelStream();
    try {
      await api.deleteConversation(convId);
      const remaining = conversations.filter((c) => c.id !== convId);
      setConversations(remaining);

      if (activeConversation?.id === convId) {
        if (remaining.length > 0) {
          setActiveConversation(remaining[0]);
        } else {
          setActiveConversation(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      setBackendError(err instanceof Error ? err.message : "Failed to delete conversation");
    }
  };

  // --------------------------------------------------------------------------
  // Document Selection & Readiness Verification
  // --------------------------------------------------------------------------
  const toggleSelectDocument = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const removeSelectedDocument = (docId: string) => {
    setSelectedDocIds((prev) => prev.filter((id) => id !== docId));
  };

  // --------------------------------------------------------------------------
  // Send Message Handler
  // --------------------------------------------------------------------------
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isStreaming) return;

    const content = chatInput.trim();
    setChatInput("");

    let targetConv = activeConversation;
    if (!targetConv) {
      try {
        targetConv = await api.createConversation({ title: content.slice(0, 48) });
        setConversations((prev) => [targetConv!, ...prev]);
        setActiveConversation(targetConv);
      } catch {
        setBackendError("Failed to initialize new conversation");
        setChatInput(content);
        return;
      }
    }

    let docIdsToSend = [...selectedDocIds];
    if (stagedFiles.length > 0 && targetConv?.id) {
      const filesToUpload = [...stagedFiles];
      setStagedFiles([]);
      try {
        const uploadedDocs = await Promise.all(
          filesToUpload.map((f) => api.uploadConversationDocument(targetConv!.id, f))
        );
        setConversationDocs((prev) => [...uploadedDocs, ...prev]);
        const newIds = uploadedDocs.map((d) => d.id);
        docIdsToSend = [...docIdsToSend, ...newIds];
        setSelectedDocIds(docIdsToSend);
      } catch (uploadErr) {
        console.warn("Failed to upload staged files:", uploadErr);
      }
    }

    if (docIdsToSend.length > 0) {
      const pendingDocs = conversationDocs.filter(
        (d) =>
          docIdsToSend.includes(d.id) &&
          (d.processingStatus === "PROCESSING" ||
            d.processingStatus === "UPLOADED" ||
            d.processingStatus === "PENDING")
      );

      if (pendingDocs.length > 0) {
        setDocNotification(
          `${pendingDocs.length} document(s) are actively processing. AI will proceed once indexing finishes.`
        );
      }
    }

    const isDeep = executionMode === "DEEP_RESEARCH" || docIdsToSend.length > 0;

    try {
      await executeSendMessage(content, docIdsToSend, isDeep);
    } catch (sendErr) {
      console.error("Failed to stream message:", sendErr);
      setChatInput(content);
    }
  };

  const handleViewReport = async (reportId: string, taskId?: string) => {
    if (taskId && reportsMap[taskId]) {
      setSelectedReportForModal(reportsMap[taskId]);
      setIsReportModalOpen(true);
      return;
    }

    try {
      const rep = await api.getReportDetail(reportId);
      if (taskId) {
        setReportsMap((prev) => ({ ...prev, [taskId]: rep }));
      }
      setSelectedReportForModal(rep);
      setIsReportModalOpen(true);
    } catch (err) {
      console.error("Failed to load report detail:", err);
      setBackendError("Could not retrieve full research report.");
    }
  };

  const handleCitationClick = (evidenceId: string, citation?: ReportCitationResponse) => {
    setDrawerEvidenceId(evidenceId);
    setDrawerCachedCitation(citation || null);
  };

  const filteredConversations = conversations.filter((c) => {
    const q = searchFilter.toLowerCase();
    return (
      (c.title && c.title.toLowerCase().includes(q)) ||
      (c.summary && c.summary.toLowerCase().includes(q)) ||
      c.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#0A0C10] text-[#F8FAFC] font-sans selection:bg-[#D4A373] selection:text-[#090A0D]">
      
      {/* ========================================================
          LEFT SIDEBAR: CONVERSATION LEDGER
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
                onClick={() => loadConversations(false)}
                className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161A22] transition-colors cursor-pointer"
                title="Refresh conversations"
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

          {/* New Conversation Button & Search */}
          <div className="p-3.5 border-b border-[#1C202A] space-y-2.5">
            <button
              type="button"
              onClick={handleCreateConversation}
              className="w-full h-9 px-3 rounded-md bg-[#F8FAFC] hover:bg-[#FFFFFF] text-[#090A0D] text-xs font-semibold tracking-wide flex items-center justify-between transition-colors uppercase cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                New Conversation
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
                placeholder="Search conversations..."
                className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[#11141C] border border-[#1C202A] text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#D4A373] transition-colors font-sans"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin">
            <div className="px-2 py-1 text-[11px] font-mono text-[#64748B] tracking-wider uppercase flex items-center justify-between">
              <span>Conversations ({filteredConversations.length})</span>
            </div>

            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-[#64748B]">
                No conversations yet. Start a new dialogue above.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.id === activeConversation?.id;
                const isEditing = editingTitleId === conv.id;

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      if (!isActive) {
                        cancelStream();
                        setActiveConversation(conv);
                        setSelectedDocIds([]);
                      }
                    }}
                    className={`group/item p-3 rounded-lg cursor-pointer transition-all border relative ${
                      isActive
                        ? "bg-[#161B26] border-[#D4A373]/40 text-[#F8FAFC]"
                        : "border-transparent text-[#94A3B8] hover:bg-[#11141C] hover:text-[#E2E8F0]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editTitleValue}
                          onChange={(e) => setEditTitleValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateTitle(conv.id, editTitleValue);
                            if (e.key === "Escape") setEditingTitleId(null);
                          }}
                          onBlur={() => handleUpdateTitle(conv.id, editTitleValue)}
                          autoFocus
                          className="w-full bg-[#0C0E14] border border-[#D4A373] px-2 py-0.5 rounded text-xs text-[#F8FAFC] focus:outline-none"
                        />
                      ) : (
                        <span className="font-medium text-xs truncate text-[#F8FAFC] max-w-[200px]">
                          {conv.title || "Untitled Conversation"}
                        </span>
                      )}

                      <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTitleId(conv.id);
                            setEditTitleValue(conv.title);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                          title="Rename conversation"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                      <span className="truncate max-w-[180px]">
                        {conv.summary || "Conversation active"}
                      </span>
                      <span suppressHydrationWarning className="font-mono text-[10px] shrink-0">
                        {conv.lastMessageAt
                          ? new Date(conv.lastMessageAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })
                          : isMounted && conv.createdAt
                          ? new Date(conv.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })
                          : ""}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Backend & User Connectivity Info */}
          <div className="h-14 px-4 border-t border-[#1C202A] flex items-center justify-between text-xs text-[#64748B]">
            <div className="flex items-center gap-2 overflow-hidden">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  backendOnline === true
                    ? "bg-[#10B981]"
                    : backendOnline === false
                    ? "bg-rose-500"
                    : "bg-slate-500"
                }`}
              />
              <div className="overflow-hidden">
                <div className="text-[#94A3B8] text-[11px] font-mono truncate">
                  {currentUser ? currentUser.name || currentUser.email : "Backend Online"}
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  {currentUser?.email || "Ready"}
                </div>
              </div>
            </div>

            <span className="font-mono text-[10px] text-slate-500 shrink-0">
              {activeConversation ? "Active" : "Idle"}
            </span>
          </div>
        </aside>
      ) : null}

      {/* ========================================================
          MAIN WORKSPACE (CHAT & DOSSIER STREAM)
         ======================================================== */}
      <main className="relative flex-1 flex flex-col h-full overflow-hidden bg-[#0A0C10]">
        
        {/* Masthead Header */}
        <header className="h-14 px-4 sm:px-8 flex items-center justify-between border-b border-[#1C202A] bg-[#0C0E14]/70 backdrop-blur-md shrink-0">
          
          <div className="flex items-center gap-3 overflow-hidden">
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161A22] transition-colors mr-1 cursor-pointer shrink-0"
                title="Expand sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium overflow-hidden">
              <span className="text-[#64748B] font-mono truncate shrink-0">
                {activeConversation?.id ? `${activeConversation.id.slice(0, 8)}...` : "NEW"}
              </span>
              <span className="text-[#475569]">/</span>
              <h1 className="text-[#F8FAFC] font-semibold truncate max-w-[240px] sm:max-w-[420px]">
                {activeConversation?.title || "Conversational Intelligence"}
              </h1>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Attach Documents Button */}
            <button
              type="button"
              onClick={() => setIsDocModalOpen(true)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer border ${
                conversationDocs.length > 0 || stagedFiles.length > 0
                  ? "text-[#D4A373] bg-[#D4A373]/10 border-[#D4A373]/30 hover:bg-[#D4A373]/20"
                  : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161A22] border-[#1C202A]"
              }`}
              title="Attach documents for RAG context"
            >
              <Paperclip className="w-3.5 h-3.5 text-[#D4A373]" />
              <span className="hidden sm:inline">RAG Docs</span>
              {(conversationDocs.length > 0 || stagedFiles.length > 0) && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#D4A373] text-[#0A0C10] font-bold text-[10px]">
                  {conversationDocs.length || stagedFiles.length}
                </span>
              )}
            </button>

            {/* Deep Research Mode Pill */}
            <button
              type="button"
              onClick={() =>
                setExecutionMode(
                  executionMode === "DEEP_RESEARCH" ? "STANDARD" : "DEEP_RESEARCH"
                )
              }
              className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs cursor-pointer transition-all ${
                executionMode === "DEEP_RESEARCH"
                  ? "bg-[#D4A373]/15 border-[#D4A373]/40 text-[#D4A373]"
                  : "bg-[#12151D] border-[#1C202A] text-slate-400 hover:text-slate-200"
              }`}
              title="Toggle Deep Research Mode"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  executionMode === "DEEP_RESEARCH"
                    ? "bg-[#D4A373] shadow-[0_0_8px_#D4A373] animate-pulse"
                    : "bg-slate-500"
                }`}
              />
              <span className="font-mono text-[11px] hidden sm:inline">
                {executionMode}
              </span>
            </button>
          </div>
        </header>

        {/* Message Stream Area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 scrollbar-thin"
        >
          <div className="max-w-3xl mx-auto space-y-6">
            
            {backendError && (
              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/50 text-xs text-rose-300 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{backendError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBackendError(null)}
                  className="p-1 text-rose-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {streamError && (
              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/50 text-xs text-rose-300 flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>Stream error: {streamError}</span>
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

            {/* Document Processing Progress Indicator */}
            {isDocumentProcessing && (
              <div className="p-3.5 rounded-xl bg-[#0F131C] border border-[#D4A373]/30 text-xs text-[#D4A373] flex items-center gap-3 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-[#D4A373] shrink-0" />
                <span className="font-mono">
                  Vectorizing and indexing attached documents into RAG memory...
                </span>
              </div>
            )}

            {/* Render Message History */}
            {messages.length > 0 ? (
              <div className="space-y-6">
                {messages.map((msg, idx) => (
                  <ChatMessageItem
                    key={msg.id}
                    message={msg}
                    isStreaming={isStreaming && idx === messages.length - 1 && msg.role === "ASSISTANT"}
                    onCitationClick={handleCitationClick}
                    onViewReport={handleViewReport}
                    onRetry={(content) => {
                      executeSendMessage(content, selectedDocIds, executionMode === "DEEP_RESEARCH");
                    }}
                    reportDetailsMap={reportsMap}
                  />
                ))}
              </div>
            ) : isLoadingHistory ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-8 h-8 mx-auto text-[#D4A373] animate-spin" />
                <p className="text-xs font-mono text-slate-400">Loading conversation history...</p>
              </div>
            ) : (
              <div className="py-16 text-center space-y-6">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#D4A373]/10 border border-[#D4A373]/30 flex items-center justify-center text-[#D4A373]">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-3 max-w-md mx-auto">
                  <h2 className="text-xl font-bold tracking-tight text-[#F8FAFC]">
                    Nymbus Research Intelligence
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed font-mono">
                    Enter any complex scientific hypothesis or research topic. Nymbus queries live web indexes,
                    ingests proprietary documents, plans execution graphs, and compiles cryptographically verifiable proofs.
                  </p>

                  <div className="pt-2 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDocModalOpen(true)}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#141822] hover:bg-[#1C2230] text-[#D4A373] border border-[#D4A373]/30 text-xs font-mono transition-all cursor-pointer shadow-md hover:border-[#D4A373]/60 group"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-[#D4A373] group-hover:rotate-45 transition-transform" />
                      <span>Attach Documents (RAG)</span>
                      {selectedDocIds.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[#D4A373] text-[#0A0C10] font-bold text-[10px]">
                          {selectedDocIds.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ========================================================
            FLOATING COMMAND DOCK & CHAT INPUT
           ======================================================== */}
        <div className="p-4 sm:p-6 bg-gradient-to-t from-[#0A0C10] via-[#0A0C10]/95 to-transparent shrink-0">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto space-y-2.5">
            
            {/* Selected Documents Shelf */}
            {(selectedDocIds.length > 0 || stagedFiles.length > 0) && (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#121620] border border-[#D4A373]/30 text-xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Paperclip className="w-3.5 h-3.5 text-[#D4A373] shrink-0" />
                  <span className="font-mono text-[11px] text-[#94A3B8] shrink-0">
                    Attached Corpus ({selectedDocIds.length + stagedFiles.length}):
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap overflow-hidden">
                    {conversationDocs
                      .filter((d) => selectedDocIds.includes(d.id))
                      .map((doc) => (
                        <span
                          key={doc.id}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#161B26] border border-[#1C202A] text-[11px] font-mono text-[#F8FAFC]"
                        >
                          <FileText className="w-3 h-3 text-[#D4A373]" />
                          <span className="truncate max-w-[130px]">{doc.fileName || doc.filename}</span>
                          <button
                            type="button"
                            onClick={() => removeSelectedDocument(doc.id)}
                            className="text-slate-500 hover:text-rose-400 font-bold ml-1 cursor-pointer"
                            title="Remove attachment"
                          >
                            ×
                          </button>
                        </span>
                      ))}

                    {stagedFiles.map((file, idx) => (
                      <span
                        key={`staged-${idx}`}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#161B26] border border-[#D4A373]/30 text-[11px] font-mono text-[#D4A373]"
                      >
                        <FileText className="w-3 h-3 text-[#D4A373]" />
                        <span className="truncate max-w-[130px]">{file.name} (Staged)</span>
                        <button
                          type="button"
                          onClick={() => setStagedFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-slate-500 hover:text-rose-400 font-bold ml-1 cursor-pointer"
                          title="Remove staged file"
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
                  Manage +
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

              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder="Ask an empirical research question or request verified proof... (Enter to send, Shift+Enter for newline)"
                disabled={isStreaming}
                className="w-full py-3.5 pr-28 sm:pr-32 bg-transparent text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none font-sans resize-none max-h-32"
              />

              {/* Action Buttons */}
              <div className="absolute right-2 flex items-center gap-1.5">
                <button
                  type="submit"
                  disabled={isStreaming || !chatInput.trim()}
                  className="px-3 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#FFFFFF] disabled:bg-[#1C202A] disabled:text-[#64748B] text-[#090A0D] font-mono text-xs font-bold transition-all flex items-center gap-1.5 uppercase cursor-pointer"
                >
                  {isStreaming ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="hidden sm:inline">Streaming</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Send</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Prompt Presets */}
            <div className="flex items-center gap-2 overflow-x-auto text-xs text-[#64748B] scrollbar-none">
              <span className="text-[11px] font-mono shrink-0">Try:</span>
              <button
                type="button"
                onClick={() =>
                  setChatInput("What are the latest verified technical milestones achieved by Commonwealth Fusion Systems and Helion Energy?")
                }
                className="px-2.5 py-0.5 rounded-full bg-[#141822] hover:bg-[#1C2230] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1C202A] whitespace-nowrap transition-colors cursor-pointer font-mono text-[11px]"
              >
                Fusion Energy Milestones
              </button>
              <button
                type="button"
                onClick={() =>
                  setChatInput("Analyze critical current density scaling in YBCO superconducting tapes under high Lorentz forces.")
                }
                className="px-2.5 py-0.5 rounded-full bg-[#141822] hover:bg-[#1C2230] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1C202A] whitespace-nowrap transition-colors cursor-pointer font-mono text-[11px]"
              >
                YBCO Superconductors
              </button>
              <button
                type="button"
                onClick={() =>
                  setChatInput("Check off-target Cas12a trans-cleavage rates across human non-coding introns.")
                }
                className="px-2.5 py-0.5 rounded-full bg-[#141822] hover:bg-[#1C2230] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1C202A] whitespace-nowrap transition-colors cursor-pointer font-mono text-[11px]"
              >
                Cas12a Cleavage
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* ========================================================
          DOCUMENT UPLOAD MODAL (CONVERSATION RAG)
         ======================================================== */}
      <DocumentUploadModal
        conversationId={activeConversation?.id || null}
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        selectedDocumentIds={selectedDocIds}
        onToggleSelectDocument={toggleSelectDocument}
        stagedFiles={stagedFiles}
        onStageFiles={(files) => setStagedFiles((prev) => [...prev, ...files])}
        onRemoveStagedFile={(idx) => setStagedFiles((prev) => prev.filter((_, i) => i !== idx))}
        onUploaded={(doc) => {
          setConversationDocs((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
          if (!selectedDocIds.includes(doc.id)) {
            setSelectedDocIds((prev) => [...prev, doc.id]);
          }
          setDocNotification(
            `Document "${doc.fileName || doc.filename}" attached. Embedding pipeline is indexing chunks.`
          );
          setTimeout(() => setDocNotification(null), 6000);
        }}
      />

      {/* ========================================================
          RESEARCH REPORT VIEWER MODAL
         ======================================================== */}
      <ResearchReportModal
        report={selectedReportForModal}
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setSelectedReportForModal(null);
        }}
        onCitationClick={handleCitationClick}
      />

      {/* ========================================================
          SLIDE-OUT EVIDENCE & SOURCE PASSAGE DRAWER
          (Layered on top of report modal when inspecting citations)
         ======================================================== */}
      <EvidenceDrawer
        evidenceId={drawerEvidenceId}
        cachedCitation={drawerCachedCitation}
        onClose={() => {
          setDrawerEvidenceId(null);
          setDrawerCachedCitation(null);
        }}
      />

    </div>
  );
}
