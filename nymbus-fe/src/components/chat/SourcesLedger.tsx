"use client";

import React from "react";
import { Globe, FileText, ExternalLink, Hash } from "lucide-react";
import { SourceResponse } from "@/types/nymbus";

interface SourcesLedgerProps {
  sources: SourceResponse[];
}

export function SourcesLedger({ sources }: SourcesLedgerProps) {
  if (!sources || sources.length === 0) {
    return (
      <div className="p-6 text-center text-xs font-mono text-slate-400 border border-[#1C202A] rounded-xl bg-[#090A0D]">
        No sources retrieved yet. Web searches and document chunks will populate here during execution.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {sources.map((src, idx) => (
        <div
          key={src.id || idx}
          className="p-3.5 rounded-xl bg-[#090A0D] border border-[#1C202A] hover:border-[#D4A373]/30 transition-colors flex items-start justify-between gap-3 text-xs"
        >
          <div className="flex items-start gap-2.5 overflow-hidden">
            <div className="p-1.5 rounded-lg bg-white/5 text-[#D4A373] flex-shrink-0 mt-0.5">
              {src.sourceType === "WEB" ? (
                <Globe className="w-3.5 h-3.5" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="overflow-hidden space-y-0.5">
              <div className="font-medium text-[#F8FAFC] truncate">
                {src.title || src.url || "Source Record"}
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 truncate">
                <span>{src.domain || src.sourceType}</span>
                {src.publisher && <span>· {src.publisher}</span>}
                {src.canonicalUrlHash && (
                  <span className="text-slate-400">
                    · Hash: {src.canonicalUrlHash.slice(0, 10)}...
                  </span>
                )}
              </div>
            </div>
          </div>

          {src.url && (
            <a
              href={src.url}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg text-[#D4A373] hover:text-white hover:bg-white/5 transition-colors flex-shrink-0"
              title="Open source URL"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
