"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Check,
} from "lucide-react";
import { DocumentResponse, DocumentProcessingStatus } from "@/types/nymbus";
import { api } from "@/lib/api";

interface DocumentUploadModalProps {
  conversationId?: string | null;
  taskId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUploaded?: (doc: DocumentResponse) => void;
  selectedDocumentIds?: string[];
  onToggleSelectDocument?: (docId: string) => void;
  stagedFiles?: File[];
  onStageFiles?: (files: File[]) => void;
  onRemoveStagedFile?: (index: number) => void;
}

export function DocumentUploadModal({
  conversationId,
  taskId,
  isOpen,
  onClose,
  onUploaded,
  selectedDocumentIds = [],
  onToggleSelectDocument,
  stagedFiles = [],
  onStageFiles,
  onRemoveStagedFile,
}: DocumentUploadModalProps) {
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const activeId = conversationId || taskId;

  const fetchDocs = useCallback(async () => {
    if (!activeId) return;
    try {
      if (conversationId) {
        const list = await api.listConversationDocuments(conversationId);
        setDocuments(list);
      } else if (taskId) {
        const list = await api.listDocuments(taskId);
        setDocuments(list);
      }
    } catch (err) {
      console.warn("Failed to load documents:", err);
    }
  }, [conversationId, taskId, activeId]);

  useEffect(() => {
    if (!isOpen || !activeId) return;
    fetchDocs();
  }, [isOpen, activeId, fetchDocs]);

  // Auto-poll if any document is in UPLOADED or PROCESSING status
  useEffect(() => {
    if (!isOpen || !activeId) return;

    const hasPending = documents.some((d) => {
      const status = d.processingStatus;
      return (
        status === "UPLOADED" ||
        status === "PROCESSING" ||
        status === "PENDING" ||
        status === "PARSING" ||
        status === "CHUNKING" ||
        status === "EMBEDDING"
      );
    });

    if (!hasPending) return;

    const interval = setInterval(() => {
      fetchDocs();
    }, 1500);

    return () => clearInterval(interval);
  }, [isOpen, activeId, documents, fetchDocs]);

  if (!isOpen) return null;

  const handleProcessFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    setUploadError(null);
    setUploadSuccess(null);

    // Filter by allowed file extensions: .pdf, .txt, .md, .csv, .docx
    const allowedExtensions = [".pdf", ".txt", ".md", ".csv", ".docx"];
    const invalidFiles = fileList.filter((f) => {
      const name = f.name.toLowerCase();
      return !allowedExtensions.some((ext) => name.endsWith(ext));
    });

    if (invalidFiles.length > 0) {
      setUploadError(
        `Unsupported file type(s): ${invalidFiles.map((f) => f.name).join(", ")}. Supported formats: PDF, TXT, Markdown, CSV, and DOCX.`
      );
      return;
    }

    // If no active conversation/task yet, stage files in parent
    if (!activeId) {
      onStageFiles?.(fileList);
      setUploadSuccess(
        fileList.length === 1
          ? `"${fileList[0].name}" staged for upcoming message.`
          : `${fileList.length} files staged for upcoming message.`
      );
      return;
    }

    // Direct upload
    setIsUploading(true);
    try {
      const uploadedDocs: DocumentResponse[] = [];
      for (const file of fileList) {
        let doc: DocumentResponse;
        if (conversationId) {
          doc = await api.uploadConversationDocument(conversationId, file);
        } else {
          doc = await api.uploadDocument(taskId!, file);
        }
        uploadedDocs.push(doc);
        setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
        onUploaded?.(doc);
        // Automatically select the freshly uploaded document if selector provided
        if (onToggleSelectDocument && !selectedDocumentIds.includes(doc.id)) {
          onToggleSelectDocument(doc.id);
        }
      }
      setUploadSuccess(
        uploadedDocs.length === 1
          ? `"${uploadedDocs[0].fileName}" uploaded successfully. Processing document into RAG memory...`
          : `${uploadedDocs.length} documents uploaded and queued for processing.`
      );
      setTimeout(fetchDocs, 1200);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFiles(e.dataTransfer.files);
    }
  };

  const getStatusLabel = (status: DocumentProcessingStatus) => {
    switch (status) {
      case "READY":
      case "COMPLETED":
        return { label: "Ready", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
      case "FAILED":
        return { label: "Failed", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
      case "CHUNKING":
        return { label: "Chunking...", color: "text-[#D4A373] bg-[#D4A373]/10 border-[#D4A373]/20 animate-pulse" };
      case "EMBEDDING":
        return { label: "Embedding...", color: "text-[#D4A373] bg-[#D4A373]/10 border-[#D4A373]/20 animate-pulse" };
      case "PARSING":
        return { label: "Parsing...", color: "text-[#D4A373] bg-[#D4A373]/10 border-[#D4A373]/20 animate-pulse" };
      case "PROCESSING":
      case "UPLOADED":
      case "PENDING":
      default:
        return { label: "Processing...", color: "text-[#D4A373] bg-[#D4A373]/10 border-[#D4A373]/20 animate-pulse" };
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="w-full max-w-xl bg-[#0E1015] border border-[#1C202A] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1C202A] bg-[#090A0D]">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-[#D4A373]" />
            <h3 className="text-sm font-semibold text-[#F8FAFC]">
              Attach Documents (RAG Intelligence)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Upload PDF, TXT, Markdown, CSV, or DOCX documents to attach to this conversation. Documents are
            automatically chunked, embedded, and queried by AI agents for verifiable, grounded answers.
          </p>

          {/* Dropzone */}
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
              dragOver
                ? "border-[#D4A373] bg-[#D4A373]/5"
                : "border-[#1C202A] hover:border-[#D4A373]/40 bg-[#090A0D]/50"
            }`}
          >
            <input
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.txt,.md,.csv,.docx"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {isUploading ? (
              <div className="flex items-center gap-2 text-xs font-mono text-[#D4A373]">
                <Loader2 className="w-4 h-4 animate-spin" />
                Ingesting and calculating SHA-256...
              </div>
            ) : (
              <>
                <UploadCloud className="w-7 h-7 text-[#D4A373]" />
                <span className="text-xs font-medium text-[#F8FAFC]">
                  Click to browse or drag and drop document(s)
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Supported formats: PDF, TXT, Markdown, CSV, DOCX
                </span>
              </>
            )}
          </label>

          {uploadSuccess && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {uploadError && (
            <div className="p-2.5 rounded bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Staged Documents (New Conversation Mode) */}
          {!activeId && stagedFiles.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-mono uppercase text-slate-400 tracking-wider flex items-center justify-between">
                <span>Staged Documents ({stagedFiles.length})</span>
                <span className="text-[10px] text-[#D4A373] lowercase">
                  will upload upon sending message
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {stagedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded bg-[#13161D] border border-[#1C202A] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <FileText className="w-4 h-4 text-[#D4A373] shrink-0" />
                      <div className="overflow-hidden">
                        <div className="font-medium text-[#F8FAFC] truncate">
                          {file.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#D4A373] bg-[#D4A373]/10 px-2 py-0.5 rounded-full border border-[#D4A373]/20 font-medium">
                        Staged
                      </span>
                      {onRemoveStagedFile && (
                        <button
                          type="button"
                          onClick={() => onRemoveStagedFile(idx)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uploaded Documents List */}
          {activeId && documents.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-mono uppercase text-slate-400 tracking-wider flex items-center justify-between">
                <span>Conversation Documents ({documents.length})</span>
                <span className="text-[10px] text-emerald-400 lowercase">
                  {documents.filter((d) => d.processingStatus === "READY" || d.processingStatus === "COMPLETED").length} ready
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {documents.map((doc) => {
                  const isSelected = selectedDocumentIds.includes(doc.id);
                  const statusInfo = getStatusLabel(doc.processingStatus);
                  const isReady =
                    doc.processingStatus === "READY" ||
                    doc.processingStatus === "COMPLETED";

                  return (
                    <div
                      key={doc.id}
                      onClick={() => onToggleSelectDocument?.(doc.id)}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs ${
                        isSelected
                          ? "bg-[#161B26] border-[#D4A373]/50 text-[#F8FAFC]"
                          : "bg-[#13161D] border-[#1C202A] hover:border-[#1C202A]/80 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-[#D4A373] border-[#D4A373] text-[#0A0C10]"
                              : "border-[#2A3140] bg-[#11141C]"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <FileText className="w-4 h-4 text-[#D4A373] shrink-0" />
                        <div className="overflow-hidden">
                          <div className="font-medium text-[#F8FAFC] truncate">
                            {doc.fileName || doc.filename}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {(doc.fileSizeBytes / 1024).toFixed(1)} KB
                            {doc.checksumSha256 ? ` · ${doc.checksumSha256.slice(0, 8)}` : ""}
                          </div>
                          {doc.processingError && (
                            <div className="text-[10px] font-mono text-rose-400 truncate mt-0.5">
                              Error: {doc.processingError}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${statusInfo.color}`}
                        >
                          {isReady ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : doc.processingStatus === "FAILED" ? (
                            <AlertCircle className="w-3 h-3" />
                          ) : (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          )}
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-[#1C202A] bg-[#090A0D] flex items-center justify-between">
          <div className="text-[11px] font-mono text-slate-400">
            {selectedDocumentIds.length > 0
              ? `${selectedDocumentIds.length} document(s) selected for current inquiry`
              : "Click a document to select it for your next inquiry"}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[#F8FAFC] hover:bg-white text-[#0A0C10] font-mono transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
