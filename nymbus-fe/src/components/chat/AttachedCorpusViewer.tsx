"use client";

import React, { useState } from "react";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  UploadCloud,
  Layers,
  Hash,
} from "lucide-react";
import { DocumentResponse, DocumentChunkResponse } from "@/types/nymbus";
import { api } from "@/lib/api";

interface AttachedCorpusViewerProps {
  taskId: string;
  documents: DocumentResponse[];
  onOpenUpload: () => void;
}

export function AttachedCorpusViewer({
  taskId,
  documents,
  onOpenUpload,
}: AttachedCorpusViewerProps) {
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [chunksMap, setChunksMap] = useState<Record<string, DocumentChunkResponse[]>>({});
  const [loadingChunksDocId, setLoadingChunksDocId] = useState<string | null>(null);

  const toggleExpand = async (docId: string) => {
    if (expandedDocId === docId) {
      setExpandedDocId(null);
      return;
    }

    setExpandedDocId(docId);

    if (!chunksMap[docId]) {
      setLoadingChunksDocId(docId);
      try {
        const chunks = await api.getDocumentChunks(taskId, docId);
        setChunksMap((prev) => ({ ...prev, [docId]: chunks }));
      } catch (err) {
        console.warn("Failed to fetch chunks:", err);
      } finally {
        setLoadingChunksDocId(null);
      }
    }
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="p-8 text-center space-y-4 border border-[#1C202A] rounded-xl bg-[#090A0D]">
        <div className="w-10 h-10 mx-auto rounded-xl bg-[#D4A373]/10 border border-[#D4A373]/30 flex items-center justify-center text-[#D4A373]">
          <FileText className="w-5 h-5" />
        </div>
        <div className="space-y-1 max-w-sm mx-auto">
          <h4 className="text-sm font-semibold text-[#F8FAFC]">No Documents Attached</h4>
          <p className="text-xs text-slate-400 font-mono">
            Ground agent reasoning by attaching proprietary PDFs, experimental notes, or internal papers.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenUpload}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#D4A373] hover:bg-[#E5B584] text-[#0A0C10] font-mono text-xs font-bold transition-all cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Attach First Document</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
        <span>Knowledge Corpus ({documents.length} files)</span>
        <button
          type="button"
          onClick={onOpenUpload}
          className="inline-flex items-center gap-1.5 text-[#D4A373] hover:underline cursor-pointer"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload Another</span>
        </button>
      </div>

      {/* Documents List */}
      <div className="space-y-2.5">
        {documents.map((doc) => {
          const isReady =
            doc.processingStatus === "READY" ||
            doc.processingStatus === "COMPLETED";
          const isProcessing =
            doc.processingStatus === "PROCESSING" ||
            doc.processingStatus === "UPLOADED" ||
            doc.processingStatus === "PENDING";
          const isExpanded = expandedDocId === doc.id;
          const chunks = chunksMap[doc.id] || [];

          return (
            <div
              key={doc.id}
              className="rounded-xl border border-[#1C202A] bg-[#0E1118] overflow-hidden transition-all"
            >
              <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 rounded-lg bg-[#161B26] text-[#D4A373] shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden space-y-0.5">
                    <div className="font-medium text-[#F8FAFC] truncate max-w-[280px] sm:max-w-[420px]">
                      {doc.fileName}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 truncate">
                      <span>{(doc.fileSizeBytes / 1024).toFixed(1)} KB</span>
                      <span>·</span>
                      <span>SHA-256: {doc.checksumSha256?.slice(0, 8)}...</span>
                      {doc.processedAt && (
                        <>
                          <span>·</span>
                          <span suppressHydrationWarning>
                            Indexed {new Date(doc.processedAt).toLocaleTimeString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {isReady ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Indexed &amp; Ready
                    </span>
                  ) : isProcessing ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#D4A373] bg-[#D4A373]/10 px-2 py-0.5 rounded-full border border-[#D4A373]/20 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Chunking...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                      <AlertCircle className="w-3 h-3" />
                      Failed
                    </span>
                  )}

                  {isReady && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(doc.id)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1 cursor-pointer font-mono text-[11px]"
                      title="Inspect extracted chunks"
                    >
                      <Layers className="w-3.5 h-3.5 text-[#D4A373]" />
                      <span className="hidden sm:inline">
                        {isExpanded ? "Hide Chunks" : "View Chunks"}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Chunks Inspector */}
              {isExpanded && (
                <div className="p-4 border-t border-[#1C202A] bg-[#090A0D]/70 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="uppercase tracking-wider">
                      Vectorized Passages ({chunks.length})
                    </span>
                    <span className="text-[10px] text-[#D4A373]">
                      Embeddings model: 1536-dim pgvector
                    </span>
                  </div>

                  {loadingChunksDocId === doc.id ? (
                    <div className="p-4 text-center text-xs font-mono text-[#D4A373] flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading document chunks...
                    </div>
                  ) : chunks.length === 0 ? (
                    <div className="p-4 text-center text-xs font-mono text-slate-500">
                      No chunks recorded for this document yet.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {chunks.map((chk) => (
                        <div
                          key={chk.id}
                          className="p-3 rounded-lg bg-[#11141C] border border-[#1C202A] text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                            <span className="text-[#D4A373]">
                              Chunk #{chk.chunkIndex}
                            </span>
                            <span>{chk.tokenCount || 0} tokens</span>
                          </div>
                          <p className="text-[#F8FAFC] leading-relaxed font-sans text-xs bg-black/20 p-2 rounded">
                            {chk.chunkText}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
