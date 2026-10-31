"use client";

import React from "react";
import {
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Network,
  Search,
  ShieldCheck,
  BarChart3,
  FileCheck,
} from "lucide-react";
import { SubTaskResponse, AgentCode } from "@/types/nymbus";

interface SubtaskTimelineProps {
  subtasks: SubTaskResponse[];
}

const AGENT_CONFIG: Record<
  AgentCode,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  ORCHESTRATOR: {
    label: "Orchestrator",
    icon: Network,
    color: "text-purple-400 border-purple-500/30 bg-purple-950/20",
  },
  RESEARCH: {
    label: "Research Agent",
    icon: Search,
    color: "text-sky-400 border-sky-500/30 bg-sky-950/20",
  },
  VERIFICATION: {
    label: "Verification Gate",
    icon: ShieldCheck,
    color: "text-amber-400 border-amber-500/30 bg-amber-950/20",
  },
  ANALYSIS: {
    label: "Analysis Synthesis",
    icon: BarChart3,
    color: "text-emerald-400 border-emerald-500/30 bg-emerald-950/20",
  },
  REPORT: {
    label: "Report Dossier",
    icon: FileCheck,
    color: "text-[#D4A373] border-[#D4A373]/30 bg-[#D4A373]/10",
  },
};

export function SubtaskTimeline({ subtasks }: SubtaskTimelineProps) {
  if (!subtasks || subtasks.length === 0) {
    return (
      <div className="p-6 text-center text-xs font-mono text-slate-400 border border-[#1C202A] rounded-xl bg-[#090A0D]">
        No subtasks scheduled yet. Execution DAG will appear once the Orchestrator initiates.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {subtasks.map((st, index) => {
        const agent = AGENT_CONFIG[st.agentCode] || {
          label: st.agentCode,
          icon: Network,
          color: "text-slate-400 border-slate-700 bg-slate-900",
        };
        const Icon = agent.icon;

        const isRunning = st.status === "IN_PROGRESS" || st.status === "ASSIGNED";
        const isDone = st.status === "COMPLETED";
        const isFailed = st.status === "FAILED";

        return (
          <div
            key={st.id || index}
            className={`p-4 rounded-xl border transition-all ${
              isRunning
                ? "bg-[#13161D] border-[#D4A373]/50 shadow-lg shadow-[#D4A373]/5"
                : isDone
                ? "bg-[#090A0D] border-[#1C202A]"
                : isFailed
                ? "bg-rose-950/20 border-rose-900/40"
                : "bg-[#090A0D]/50 border-[#141720] opacity-60"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {/* Agent Icon Badge */}
                <div
                  className={`p-2 rounded-lg border flex-shrink-0 ${agent.color}`}
                  title={agent.label}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">
                      Step {index + 1}
                    </span>
                    <span className="text-xs font-semibold text-[#F8FAFC]">
                      {st.title}
                    </span>
                  </div>
                  {st.description && (
                    <p className="text-xs text-slate-400 font-sans leading-relaxed">
                      {st.description}
                    </p>
                  )}
                  {st.resultSummary && (
                    <p className="text-xs text-slate-300 font-mono bg-white/5 p-2 rounded mt-2 border border-white/5">
                      {st.resultSummary}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {isRunning ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono text-[#D4A373] bg-[#D4A373]/10 border border-[#D4A373]/30 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Executing
                  </span>
                ) : isDone ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-800/40">
                    <CheckCircle2 className="w-3 h-3" />
                    Done
                  </span>
                ) : isFailed ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono text-rose-400 bg-rose-950/30 border border-rose-800/40">
                    <AlertCircle className="w-3 h-3" />
                    Failed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-slate-400">
                    <Clock className="w-3 h-3" />
                    Queued
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
