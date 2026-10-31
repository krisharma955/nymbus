"use client";

import React from "react";
import { ShieldCheck, AlertCircle, HelpCircle } from "lucide-react";
import { VerificationStatus } from "@/types/nymbus";

interface CitationBadgeProps {
  label: string;
  evidenceId: string;
  status?: VerificationStatus;
  confidence?: number;
  onClick: (evidenceId: string) => void;
}

export function CitationBadge({
  label,
  evidenceId,
  status = "VERIFIED",
  confidence,
  onClick,
}: CitationBadgeProps) {
  const isVerified = status === "VERIFIED";
  const isRefuted = status === "REFUTED";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(evidenceId);
      }}
      className={`inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium transition-all cursor-pointer border ${
        isVerified
          ? "bg-[#D4A373]/10 text-[#D4A373] border-[#D4A373]/30 hover:bg-[#D4A373]/20 hover:border-[#D4A373]/50"
          : isRefuted
          ? "bg-rose-950/30 text-rose-300 border-rose-800/40 hover:bg-rose-900/40"
          : "bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-800"
      }`}
      title={`Citation ${label} - ${status}${confidence ? ` (${(confidence * 100).toFixed(1)}%)` : ""}`}
    >
      {isVerified ? (
        <ShieldCheck className="w-3 h-3 text-[#D4A373]" />
      ) : isRefuted ? (
        <AlertCircle className="w-3 h-3 text-rose-400" />
      ) : (
        <HelpCircle className="w-3 h-3 text-slate-400" />
      )}
      <span>{label}</span>
    </button>
  );
}
