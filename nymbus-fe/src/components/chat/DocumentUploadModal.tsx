"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { DocumentResponse } from "@/types/nymbus";
import { api } from "@/lib/api";

interface DocumentUploadModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUploaded?: (doc: DocumentResponse) => void;
  stagedFiles?: File[];
  onStageFiles?: (files: File[]) => void;
  onRemoveStagedFile?: (index: number) => void;
}

export function DocumentUploadModal({
  taskId,
  isOpen,
  onClose,
  onUploaded,
  stagedFiles = [],
  onStageFiles,
  onRemoveStagedFile,
}: DocumentUploadModalProps) {
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const fetchDocs = React.useCallback(async () => {
    if (!taskId) return;
    try {
      const list = await api.listDocuments(taskId);
      setDocuments(list);
    } catch (err) {
      console.warn("Failed to load documents:", err);
    }
  }, [taskId]);

  useEffect(() => {
    if (!isOpen || !taskId) return;
    fetchDocs();
  }, [isOpen, taskId, fetchDocs]);

  // Auto-poll if any document is in UPLOADED or PROCESSING status
  useEffect(() => {
    if (!isOpen || !taskId) return;

    const hasPending = documents.some(
      (d) =>
        d.processingStatus === "UPLOADED" ||
        d.processingStatus === "PROCESSING" ||
        d.processingStatus === "PENDING"
    );

    if (!hasPending) return;

    const interval = setInterval(() => {
      fetchDocs();
    }, 1500);

    return () => clearInterval(interval);
  }, [isOpen, taskId, documents, fetchDocs]);

  if (!isOpen) return null;

  const handleProcessFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    setUploadError(null);
    setUploadSuccess(null);

    // If new inquest mode (no taskId yet), stage files in parent
    if (!taskId) {
      onStageFiles?.(fileList);
      setUploadSuccess(
        fileList.length === 1
          ? `"${fileList[0].name}" staged for upcoming inquest.`
          : `${fileList.length} files staged for upcoming inquest.`
      );
      return;
    }

    // Otherwise, direct upload to active task
    setIsUploading(true);
    try {
      for (const file of fileList) {
        const doc = await api.uploadDocument(taskId, file);
        setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
        onUploaded?.(doc);
      }
      setUploadSuccess(
        fileList.length === 1
          ? `"${fileList[0].name}" attached successfully! Vector embedding pipeline is indexing it.`
          : `${fileList.length} documents attached and queued for vectorization.`
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="w-full max-w-xl bg-[#0E1015] border border-[#1C202A] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1C202A] bg-[#090A0D]">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-[#D4A373]" />
            <h3 className="text-sm font-semibold text-[#F8FAFC]">
              Attach Corpus Documents (RAG)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Upload research papers, PDFs, or internal dossiers. Documents will be chunked,
            embedded, and queried alongside web sources for verifiable claim extraction.
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
              accept=".pdf,.txt,.md,.doc,.docx"
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
                  {taskId
                    ? "PDF, TXT, Markdown, DOCX (Immediate RAG Ingestion)"
                    : "Stage files to ground your upcoming new inquest"}
                </span>
              </>
            )}
          </label>

          {uploadSuccess && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {uploadError && (
            <div className="p-2.5 rounded bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Staged Documents (New Inquest Mode) */}
          {!taskId && stagedFiles.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-mono uppercase text-slate-400 tracking-wider flex items-center justify-between">
                <span>Staged Documents ({stagedFiles.length})</span>
                <span className="text-[10px] text-[#D4A373] lowercase">
                  will be vectorized upon submit
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {stagedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded bg-[#13161D] border border-[#1C202A] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <FileText className="w-4 h-4 text-[#D4A373] flex-shrink-0" />
                      <div className="overflow-hidden">
                        <div className="font-medium text-[#F8FAFC] truncate">
                          {file.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#D4A373] bg-[#D4A373]/10 px-2 py-0.5 rounded-full border border-[#D4A373]/20 font-medium">
                        Staged for Inquest
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

          {/* Live Ingested Documents List (Active Inquest Mode) */}
          {taskId && documents.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-mono uppercase text-slate-400 tracking-wider flex items-center justify-between">
                <span>Ingested Documents ({documents.length})</span>
                <span className="text-[10px] text-emerald-400 lowercase">
                  {documents.filter((d) => d.processingStatus === "READY" || d.processingStatus === "COMPLETED").length} ready for RAG
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {documents.map((doc) => {
                  const isReady =
                    doc.processingStatus === "READY" ||
                    doc.processingStatus === "COMPLETED";
                  const isProcessing =
                    doc.processingStatus === "PROCESSING" ||
                    doc.processingStatus === "UPLOADED" ||
                    doc.processingStatus === "PENDING";

                  return (
                    <div
                      key={doc.id}
                      className="p-2.5 rounded bg-[#13161D] border border-[#1C202A] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <FileText className="w-4 h-4 text-[#D4A373] flex-shrink-0" />
                        <div className="overflow-hidden">
                          <div className="font-medium text-[#F8FAFC] truncate">
                            {doc.fileName}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {(doc.fileSizeBytes / 1024).toFixed(1)} KB · SHA-256:{" "}
                            {doc.checksumSha256?.slice(0, 8)}...
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isReady ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Indexed &amp; Ready
                          </span>
                        ) : isProcessing ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#D4A373] bg-[#D4A373]/10 px-2 py-0.5 rounded-full border border-[#D4A373]/20 animate-pulse font-medium">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Indexing Chunks...
                          </span>
                        ) : doc.processingStatus === "FAILED" ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Failed
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-400">
                            Queued
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-[#1C202A] bg-[#090A0D] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-medium bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
