"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  BookOpen,
  Hash,
  Scale,
  Sparkles,
  Loader2,
} from "lucide-react";
import { EvidenceDetailResponse, ReportCitationResponse } from "@/types/nymbus";
import { api } from "@/lib/api";

interface EvidenceDrawerProps {
  evidenceId: string | null;
  cachedCitation?: ReportCitationResponse | null;
  onClose: () => void;
}

export function EvidenceDrawer({
  evidenceId,
  cachedCitation,
  onClose,
}: EvidenceDrawerProps) {
  const [detail, setDetail] = useState<EvidenceDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!evidenceId) {
      setDetail(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    api
      .getEvidenceDetail(evidenceId)
      .then((data) => {
        if (isMounted) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Failed to fetch evidence detail:", err);
          setError(err.message || "Failed to load evidence detail");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [evidenceId]);

  useEffect(() => {
    if (!evidenceId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [evidenceId, onClose]);

  if (!evidenceId) return null;

  const claim = detail?.evidence?.claim || cachedCitation?.claim || "Evidence Claim";
  const passage =
    detail?.evidence?.supportingPassage ||
    cachedCitation?.supportingPassage ||
    "No passage recorded.";
  const status =
    detail?.evidence?.verificationStatus ||
    cachedCitation?.verificationStatus ||
    "VERIFIED";
  const confidence =
    detail?.evidence?.confidenceScore !== undefined
      ? Number(detail.evidence.confidenceScore)
      : cachedCitation?.confidenceScore !== undefined
      ? Number(cachedCitation.confidenceScore)
      : 0.95;

  const isVerified = status === "VERIFIED";

  return (
    <>
      {/* Backdrop for Evidence Drawer (sits over any open modal/content) */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[65] animate-in fade-in duration-150 cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-[#0E1015] border-l border-[#1C202A] shadow-2xl z-[70] flex flex-col backdrop-blur-xl animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1C202A] bg-[#090A0D]/70">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-[#D4A373]" />
          <span className="text-xs uppercase tracking-wider font-mono text-[#D4A373]">
            Provable Citation Audit
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {loading && !cachedCitation ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mb-2 text-[#D4A373]" />
            <span className="text-xs font-mono">Resolving cryptographic passage...</span>
          </div>
        ) : (
          <>
            {error && !cachedCitation && (
              <div className="p-3 text-xs bg-rose-950/40 border border-rose-900/60 rounded text-rose-300">
                {error}
              </div>
            )}

            {/* Verification Status Bead */}
            <div className="p-4 rounded-lg bg-[#13161D] border border-[#1C202A] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isVerified ? (
                    <ShieldCheck className="w-4 h-4 text-[#D4A373]" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  )}
                  <span
                    className={`text-xs font-mono font-semibold uppercase ${
                      isVerified ? "text-[#D4A373]" : "text-rose-400"
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Confidence:{" "}
                  <span className="text-[#F8FAFC] font-semibold">
                    {(confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Confidence Progress Bar */}
              <div className="w-full bg-[#090A0D] h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isVerified ? "bg-[#D4A373]" : "bg-rose-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, confidence * 100))}%` }}
                />
              </div>
            </div>

            {/* Atomic Claim */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#D4A373]" />
                Extracted Atomic Claim
              </label>
              <div className="p-3 rounded-lg bg-[#090A0D] border border-[#1C202A] text-sm text-[#F8FAFC] font-sans leading-relaxed">
                {claim}
              </div>
            </div>

            {/* Verbatim Supporting Passage */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3 h-3 text-[#D4A373]" />
                Verbatim Source Passage
              </label>
              <div className="p-3.5 rounded-lg bg-[#090A0D] border border-[#D4A373]/20 text-xs font-mono leading-relaxed text-slate-300 relative">
                <span className="text-[#D4A373] select-none font-bold mr-1">&ldquo;</span>
                <span className="bg-[#D4A373]/10 text-[#F8FAFC] px-1 py-0.5 rounded">
                  {passage}
                </span>
                <span className="text-[#D4A373] select-none font-bold ml-1">&rdquo;</span>
              </div>
            </div>

            {/* Verifier Reasoning if available */}
            {detail?.verificationResults && detail.verificationResults.length > 0 && (
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
                  Verification Evaluation
                </label>
                <div className="space-y-2">
                  {detail.verificationResults.map((vr) => (
                    <div
                      key={vr.id}
                      className="p-3 rounded bg-[#090A0D]/60 border border-[#1C202A] text-xs font-sans text-slate-300 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>Agent Gate: {vr.status}</span>
                        <span>{new Date(vr.evaluatedAt).toLocaleTimeString()}</span>
                      </div>
                      {vr.reasoning && <p className="text-slate-300">{vr.reasoning}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sources List */}
            {cachedCitation?.sources && cachedCitation.sources.length > 0 && (
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Hash className="w-3 h-3 text-[#D4A373]" />
                  Linked Source Documents
                </label>
                <div className="space-y-2">
                  {cachedCitation.sources.map((src, i) => (
                    <div
                      key={src.sourceId || i}
                      className="p-2.5 rounded bg-[#13161D] border border-[#1C202A] flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 overflow-hidden">
                        <div className="font-medium text-[#F8FAFC] truncate">
                          {src.title || src.domain || "Primary Source"}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate">
                          {src.domain || src.sourceType}
                        </div>
                      </div>
                      {src.url && (
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded text-[#D4A373] hover:text-white hover:bg-white/5 transition-colors flex-shrink-0"
                          title="Open external source"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence ID / Hash */}
            <div className="pt-2 border-t border-[#1C202A] flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Locator:</span>
              <span className="text-slate-300 truncate max-w-[240px]">{evidenceId}</span>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}
