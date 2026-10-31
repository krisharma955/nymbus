"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronDown,
  X,
  FileText,
  Hash,
  Terminal,
  Activity,
  Layers,
  ArrowUpRight,
  PanelLeftClose,
  PanelLeft,
  Share2,
  Copy,
  Check,
} from "lucide-react";

/* --------------------------------------------------------------------------
   TYPES & CONTRACTS
-------------------------------------------------------------------------- */

interface InquestSession {
  id: string;
  title: string;
  summary: string;
  timestamp: string;
  hash: string;
  status: "verified" | "in-flight" | "refuted" | "flagged";
  score: number;
  subtaskCount: number;
  tokens: string;
}

interface SubtaskStep {
  id: string;
  agent: string;
  name: string;
  status: "complete" | "in-flight" | "pending";
  latency?: string;
  detail: string;
}

interface CitationReference {
  id: string;
  tag: string;
  title: string;
  source: string;
  doi: string;
  paragraph: string;
  highlight: string;
  claim: string;
  entailmentScore: number;
  hash: string;
  verifiedAt: string;
}

/* --------------------------------------------------------------------------
   MOCK SEED DATA
-------------------------------------------------------------------------- */

const SESSIONS: InquestSession[] = [
  {
    id: "INQ-492",
    title: "SPARC 20.1T Magnet Stress Tolerances",
    summary: "High-field REBCO conductor yield stresses under cryogenic 18.5 kA excitation.",
    timestamp: "15:20 UTC · Just now",
    hash: "0a56b1986683477589c673a668765655c38cdab3ac9826354890282638402846",
    status: "verified",
    score: 98.4,
    subtaskCount: 5,
    tokens: "3.8k",
  },
  {
    id: "INQ-491",
    title: "LK-99 Resistance & Diamagnetism",
    summary: "Adversarial verification of Cu2S impurity phase transition vs superconductivity.",
    timestamp: "2h ago",
    hash: "c189e402a7b89945102df08273619280145efab3091823746192038102948123",
    status: "refuted",
    score: 99.8,
    subtaskCount: 4,
    tokens: "5.1k",
  },
  {
    id: "INQ-490",
    title: "CRISPR-Cas12a Human Exon Off-Targets",
    summary: "Genome-wide deep sequencing off-target indel rate validation across 400 cell lines.",
    timestamp: "Yesterday",
    hash: "7f22a104bc892716382901847261920481726351920471829304918273619283",
    status: "verified",
    score: 96.2,
    subtaskCount: 5,
    tokens: "4.4k",
  },
  {
    id: "INQ-489",
    title: "Helium-3 Abundance in Lunar Regolith",
    summary: "Chang'e-5 isotopic composition and extraction thermals at 700°C.",
    timestamp: "2 days ago",
    hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    status: "verified",
    score: 94.7,
    subtaskCount: 3,
    tokens: "2.9k",
  },
  {
    id: "INQ-488",
    title: "Room-Temp Lu-H-N Resistance Claims",
    summary: "Dias et al. 1 GPa diamond anvil cell electrical resistance drop reproducibility.",
    timestamp: "3 days ago",
    hash: "a804bd1192837461928471625394817263519284716253948172635192847162",
    status: "flagged",
    score: 82.1,
    subtaskCount: 4,
    tokens: "6.2k",
  },
];

const CITATIONS: Record<string, CitationReference> = {
  "c1": {
    id: "c1",
    tag: "[1] § 14.2 · NATURE ENERGY",
    title: "The high-field superconducting toroidal magnet for the SPARC tokamak",
    source: "Nature Energy (2025)",
    doi: "10.1038/s41560-025-0142-9",
    paragraph: "Section 14.2, Paragraph 4, Lines 12-28",
    highlight:
      "Peak central magnetic field reached 20.13 T at 18.5 kA operating current. Structural finite-element modeling confirmed peak Von Mises mechanical stress inside the radial structural plates sustained 612 ± 15 MPa, maintaining an 88 MPa margin below the 700 MPa yield threshold.",
    claim: "SPARC toroidal field magnet safely sustained 20.1 T without exceeding the 700 MPa structural yield threshold.",
    entailmentScore: 98.4,
    hash: "0a56b1986683477589c673a668765655c38cdab3ac9826354890282638402846",
    verifiedAt: "15:20:25 UTC by VerificationAgent-01",
  },
  "c2": {
    id: "c2",
    tag: "[2] § 8.4 · MIT PSFC REPORT",
    title: "Mechanical and Cryogenic Quench Protection Testing of Model Coil 1",
    source: "MIT Plasma Science and Fusion Center Technical Report #PSFC/RR-24-11",
    doi: "10.48550/arXiv.2409.08122",
    paragraph: "Section 8.4: Coil Quench Transients and Strain Sensor Telemetry",
    highlight:
      "Across 42 experimental rapid discharge and simulated quench cycles, optical Fiber Bragg Grating strain sensors recorded zero permanent plastic deformation or delamination in the REBCO conductor stack.",
    claim: "Repeated pulse discharge cycles caused no detectable plastic deformation or winding degradation.",
    entailmentScore: 97.8,
    hash: "9b3c411298471625394817263519284716253948172635192847162539481726",
    verifiedAt: "15:20:28 UTC by VerificationAgent-02",
  },
};

export default function ChatWorkspacePage() {
  const [sessions, setSessions] = useState<InquestSession[]>(SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string>("INQ-492");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [drawerCitation, setDrawerCitation] = useState<CitationReference | null>(null);
  const [inquestInput, setInquestInput] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [traceExpanded, setTraceExpanded] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Dynamic Subtask Timeline State
  const [subtasks, setSubtasks] = useState<SubtaskStep[]>([
    {
      id: "st-1",
      agent: "OrchestratorAgent",
      name: "DAG Decomposition",
      status: "complete",
      latency: "120ms",
      detail: "Deconstructed hypothesis into 3 testable structural claims & cycle-free execution DAG.",
    },
    {
      id: "st-2",
      agent: "ResearchAgent",
      name: "Tavily Corpus & Vector Retrieval",
      status: "complete",
      latency: "840ms",
      detail: "Extracted 6 peer-reviewed documents from arXiv and Nature Energy; isolated paragraph candidates.",
    },
    {
      id: "st-3",
      agent: "VerificationAgent",
      name: "Adversarial NLI Entailment Gate",
      status: "complete",
      latency: "320ms",
      detail: "Evaluated claim against raw text: 612 MPa stress < 700 MPa yield threshold. Entailment: 98.4%.",
    },
    {
      id: "st-4",
      agent: "AnalysisAgent",
      name: "Evidence Synthesis",
      status: "complete",
      latency: "410ms",
      detail: "Corroborated 42 cryogenic discharge cycles against optical strain sensor telemetry.",
    },
    {
      id: "st-5",
      agent: "ReportAgent",
      name: "Provenance Ledger Commit",
      status: "complete",
      latency: "190ms",
      detail: "Bound findings to immutable SHA-256 locator hash. Ready for scientific dissemination.",
    },
  ]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const filteredSessions = sessions.filter((s) => {
    return (
      s.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.summary.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.id.toLowerCase().includes(searchFilter.toLowerCase())
    );
  });

  const handleCopyHash = () => {
    navigator.clipboard.writeText(activeSession.hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleExecute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquestInput.trim() || isExecuting) return;

    const newQuery = inquestInput.trim();
    setInquestInput("");
    setIsExecuting(true);
    setTraceExpanded(true);

    const newSession: InquestSession = {
      id: `INQ-${Math.floor(493 + Math.random() * 100)}`,
      title: newQuery.slice(0, 48) + (newQuery.length > 48 ? "..." : ""),
      summary: newQuery,
      timestamp: "Just now",
      hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      status: "in-flight",
      score: 95.0,
      subtaskCount: 4,
      tokens: "1.2k",
    };

    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);

    setSubtasks([
      {
        id: "st-1",
        agent: "OrchestratorAgent",
        name: "DAG Decomposition",
        status: "complete",
        latency: "115ms",
        detail: "Synthesizing execution plan and identifying prerequisite claims.",
      },
      {
        id: "st-2",
        agent: "ResearchAgent",
        name: "Tavily Corpus Search",
        status: "complete",
        latency: "790ms",
        detail: "Querying indexed academic repositories and extracting candidate excerpts.",
      },
      {
        id: "st-3",
        agent: "VerificationAgent",
        name: "Adversarial NLI Gate",
        status: "in-flight",
        latency: "Running...",
        detail: "Cross-referencing formal claims against extracted source sentences...",
      },
      {
        id: "st-4",
        agent: "ReportAgent",
        name: "Provenance Ledger Commit",
        status: "pending",
        detail: "Awaiting entailment verification before ledger digest lock.",
      },
    ]);

    setTimeout(() => {
      setSubtasks((prev) =>
        prev.map((st) => ({
          ...st,
          status: "complete",
          latency: st.latency === "Running..." ? "340ms" : st.latency,
        }))
      );
      setSessions((prev) =>
        prev.map((s) => (s.id === newSession.id ? { ...s, status: "verified", score: 98.7 } : s))
      );
      setIsExecuting(false);
    }, 2400);
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#0A0C10] text-[#F8FAFC] font-sans selection:bg-[#D4A373] selection:text-[#090A0D]">
      
      {/* ========================================================
          COLLAPSIBLE LEFT SIDEBAR: INQUEST LEDGER
         ======================================================== */}
      {sidebarOpen ? (
        <aside className="relative z-20 w-80 md:w-84 flex flex-col border-r border-[#1C202A] bg-[#0C0E14] select-none shrink-0 transition-all duration-200">
          
          {/* Masthead Header & Collapse Button */}
          <div className="h-14 px-4 flex items-center justify-between border-b border-[#1C202A]">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4A373] shadow-[0_0_8px_#D4A373]" />
              <span className="font-extrabold tracking-wider text-[#F8FAFC] text-sm group-hover:text-white transition-colors">
                NYMBUS
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161A22] transition-colors cursor-pointer"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Inquest Action & Search */}
          <div className="p-3.5 border-b border-[#1C202A] space-y-2.5">
            <button
              type="button"
              onClick={() => {
                setInquestInput("Verify critical current density scaling in YBCO tapes under 15T background field.");
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
                placeholder="Search past inquiries..."
                className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[#11141C] border border-[#1C202A] text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#D4A373] transition-colors"
              />
            </div>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin">
            <div className="px-2 py-1 text-[11px] font-mono text-[#64748B] tracking-wider uppercase">
              Recent Inquests ({filteredSessions.length})
            </div>

            {filteredSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    isActive
                      ? "bg-[#161B26] text-[#F8FAFC]"
                      : "text-[#94A3B8] hover:bg-[#11141C] hover:text-[#E2E8F0]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-xs truncate text-[#F8FAFC]">
                      {session.title}
                    </span>
                    {session.status === "verified" && (
                      <span className="px-1.5 py-0.2 rounded-full bg-[#10B981]/15 text-[#10B981] text-[9px] font-semibold shrink-0">
                        {session.score}%
                      </span>
                    )}
                    {session.status === "in-flight" && (
                      <span className="px-1.5 py-0.2 rounded-full bg-[#D4A373]/20 text-[#D4A373] text-[9px] font-semibold shrink-0 animate-pulse">
                        RUNNING
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#64748B] line-clamp-1 leading-relaxed">
                    {session.summary}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Footer User Info */}
          <div className="h-12 px-4 border-t border-[#1C202A] flex items-center justify-between text-xs text-[#64748B]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span className="text-[#94A3B8]">Verified Session</span>
            </div>
            <span className="font-mono text-[10px]">{activeSession.tokens} tokens</span>
          </div>
        </aside>
      ) : null}

      {/* ========================================================
          MAIN WORKSPACE (DECLUTTERED & SPATIOUS)
         ======================================================== */}
      <main className="relative flex-1 flex flex-col h-full overflow-hidden bg-[#0A0C10]">
        
        {/* Sleek Single-Line Masthead */}
        <header className="h-14 px-4 sm:px-8 flex items-center justify-between border-b border-[#1C202A] bg-[#0C0E14]/70 backdrop-blur-md shrink-0">
          
          <div className="flex items-center gap-3">
            {/* Sidebar Expand Button (when collapsed) */}
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161A22] transition-colors mr-1 cursor-pointer"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
              <span className="text-[#64748B] font-mono">{activeSession.id}</span>
              <span className="text-[#475569]">/</span>
              <h1 className="text-[#F8FAFC] font-semibold truncate max-w-[280px] sm:max-w-[460px]">
                {activeSession.title}
              </h1>
            </div>
          </div>

          {/* Right Header Status Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#12151D] border border-[#1C202A] text-xs text-[#94A3B8]">
              <span className="w-2 h-2 rounded-full bg-[#D4A373] shadow-[0_0_8px_#D4A373] animate-pulse" />
              <span className="hidden sm:inline font-mono text-[11px]">5 AGENTS ACTIVE</span>
            </div>

            <button
              type="button"
              onClick={handleCopyHash}
              className="px-2.5 py-1 rounded-md text-xs font-mono text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161A22] border border-[#1C202A] transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Copy commit hash"
            >
              {copiedHash ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="text-[#10B981]">Copied</span>
                </>
              ) : (
                <>
                  <Hash className="w-3.5 h-3.5 text-[#D4A373]" />
                  <span className="hidden sm:inline">SHA-256</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Conversation Stream (Max Reading Width: 68-72ch) */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 scrollbar-thin">
          <div className="max-w-3xl mx-auto space-y-8">
            
            {/* 1. Researcher Inquest Message */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-[#64748B]">
                <span className="text-[#94A3B8] font-medium">RESEARCHER INQUIRY</span>
                <span>15:20:10 UTC</span>
              </div>
              <div className="p-5 rounded-xl bg-[#11141C] border border-[#1C202A]">
                <p className="text-base sm:text-lg text-[#F8FAFC] leading-relaxed font-normal">
                  Verify whether SPARC toroidal field coil stress tolerances remain below the 700 MPa yield strength limit during 20.1T nominal excitation under cryogenic vacuum conditions.
                </p>
              </div>
            </div>

            {/* 2. Autonomous Subtask Pipeline (Streamlined Minimal Disclosure Pill) */}
            <div className="rounded-xl border border-[#1C202A] bg-[#0E1118] overflow-hidden">
              <button
                type="button"
                onClick={() => setTraceExpanded(!traceExpanded)}
                className="w-full p-3.5 sm:p-4 flex items-center justify-between text-xs font-mono transition-colors hover:bg-[#121620] cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  <span className="font-semibold text-[#F8FAFC]">
                    Autonomous Multi-Agent Pipeline
                  </span>
                  <span className="text-[#64748B]">
                    · {subtasks.filter((s) => s.status === "complete").length}/{subtasks.length} subtasks verified (840ms)
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

              {/* Collapsed/Expanded Subtask Items */}
              {traceExpanded && (
                <div className="p-4 pt-2 border-t border-[#1C202A] space-y-2.5 text-xs font-sans">
                  {subtasks.map((step) => (
                    <div
                      key={step.id}
                      className="p-3 rounded-md bg-[#131722] border border-[#1C202A] flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5">
                        {step.status === "complete" ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] mt-1.5 shrink-0" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-[#D4A373] animate-spin mt-0.5 shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#F8FAFC]">{step.name}</span>
                            <span className="font-mono text-[10px] text-[#D4A373]">[{step.agent}]</span>
                          </div>
                          <p className="text-[#94A3B8] text-xs mt-0.5 leading-relaxed">{step.detail}</p>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-[#64748B] shrink-0">{step.latency}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Synthesized Research Dossier (Clean Monograph Reading Experience) */}
            <article className="space-y-6 pt-2">
              
              {/* Status Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1C202A] text-xs font-mono">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#D4A373]" />
                  <span className="font-semibold text-[#F8FAFC]">
                    Synthesized Research Dossier
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] text-[11px] font-semibold">
                  98.4% Entailment Verified
                </span>
              </div>

              {/* Research Narrative Paragraphs (Supremely Readable 15px/16px font with generous line-height) */}
              <div className="space-y-5 text-[15px] sm:text-base text-[#E2E8F0] leading-[1.8]">
                <p>
                  Empirical stress tests of the <strong>SPARC toroidal field model coil</strong> confirm that under peak central magnetic field excitation of <strong>20.13 Tesla</strong> (operating at 18.5 kA), structural mechanical forces remain within designed tolerances. Finite-element stress analysis corroborated by optical Fiber Bragg Grating strain sensors recorded maximum Von Mises stress inside the radial structural plates at <strong>612 ± 15 MPa</strong>, preserving an 88 MPa margin below the 700 MPa yield threshold{" "}
                  <button
                    type="button"
                    onClick={() => setDrawerCitation(CITATIONS["c1"])}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#181D2A] hover:bg-[#222838] border border-[#D4A373] text-[#D4A373] font-mono text-xs font-semibold transition-all cursor-pointer shadow-sm align-baseline mx-1"
                  >
                    [1] § 14.2 · NATURE ENERGY
                    <ArrowUpRight className="w-3 h-3" />
                  </button>.
                </p>

                <p>
                  Furthermore, across 42 consecutive pulse discharge and quench transients, zero delamination or irreversible plastic deformation was observed in the high-temperature REBCO conductor stack{" "}
                  <button
                    type="button"
                    onClick={() => setDrawerCitation(CITATIONS["c2"])}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#181D2A] hover:bg-[#222838] border border-[#D4A373] text-[#D4A373] font-mono text-xs font-semibold transition-all cursor-pointer shadow-sm align-baseline mx-1"
                  >
                    [2] § 8.4 · MIT PSFC
                    <ArrowUpRight className="w-3 h-3" />
                  </button>, confirming non-insulated pancake winding reliability under extreme Lorentz shear stress.
                </p>

                {/* Verbatim Ground-Truth Excerpt (Understated blockquote without heavy boxes) */}
                <div className="my-6 p-4 rounded-lg bg-[#11141C]/40 border border-[#1C202A] space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B]">
                    <span className="text-[#D4A373] font-semibold">VERBATIM SOURCE PASSAGE [1]</span>
                    <span>§ 14.2, PARAGRAPH 4</span>
                  </div>
                  <p className="text-sm font-sans italic text-[#CBD5E1] leading-relaxed">
                    &quot;Peak central magnetic field reached 20.13 T at 18.5 kA operating current. Structural finite-element modeling confirmed peak Von Mises mechanical stress inside the radial structural plates sustained 612 ± 15 MPa, maintaining an 88 MPa margin below the 700 MPa yield threshold.&quot;
                  </p>
                  <div className="text-[11px] font-mono text-[#64748B] pt-1">
                    Nature Energy (2025) · DOI: 10.1038/s41560-025-0142-9
                  </div>
                </div>
              </div>

              {/* Commit Digest Minimal Footer */}
              <div className="pt-4 border-t border-[#1C202A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono text-[#64748B]">
                <div className="flex items-center gap-2">
                  <span>SHA-256:</span>
                  <span className="text-[#94A3B8] truncate max-w-[260px] sm:max-w-[360px]">
                    {activeSession.hash}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyHash}
                  className="text-[#D4A373] hover:underline cursor-pointer"
                >
                  Copy Citation Record
                </button>
              </div>
            </article>

          </div>
        </div>

        {/* ========================================================
            MINIMAL FLOATING COMMAND DOCK
           ======================================================== */}
        <div className="p-4 sm:p-6 bg-gradient-to-t from-[#0A0C10] via-[#0A0C10]/95 to-transparent shrink-0">
          <form onSubmit={handleExecute} className="max-w-3xl mx-auto space-y-2.5">
            
            {/* Input Bar */}
            <div className="relative flex items-center bg-[#11141C] border border-[#1C202A] rounded-xl focus-within:border-[#D4A373] focus-within:ring-2 focus-within:ring-[#D4A373]/20 transition-all shadow-xl">
              <div className="pl-4 pr-2 text-[#D4A373]">
                <Terminal className="w-4 h-4" />
              </div>

              <input
                type="text"
                value={inquestInput}
                onChange={(e) => setInquestInput(e.target.value)}
                placeholder="Ask an adversarial research question or request citation proof..."
                disabled={isExecuting}
                className="w-full py-3.5 pr-28 bg-transparent text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none"
              />

              <button
                type="submit"
                disabled={isExecuting || !inquestInput.trim()}
                className="absolute right-2 px-3.5 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#FFFFFF] disabled:bg-[#1C202A] disabled:text-[#64748B] text-[#090A0D] font-mono text-xs font-bold transition-all flex items-center gap-1.5 uppercase cursor-pointer"
              >
                {isExecuting ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing</span>
                  </>
                ) : (
                  <>
                    <span>Execute</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* Presets Row */}
            <div className="flex items-center gap-2 overflow-x-auto text-xs text-[#64748B]">
              <span className="text-[11px] font-mono shrink-0">Try:</span>
              <button
                type="button"
                onClick={() =>
                  setInquestInput("Verify critical current density scaling in YBCO tapes under 15T background field.")
                }
                className="px-2.5 py-0.5 rounded-full bg-[#141822] hover:bg-[#1C2230] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1C202A] whitespace-nowrap transition-colors"
              >
                YBCO Jc Scaling
              </button>
              <button
                type="button"
                onClick={() =>
                  setInquestInput("Check off-target Cas12a trans-cleavage rates across human non-coding introns.")
                }
                className="px-2.5 py-0.5 rounded-full bg-[#141822] hover:bg-[#1C2230] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1C202A] whitespace-nowrap transition-colors"
              >
                Cas12a Introns
              </button>
              <button
                type="button"
                onClick={() =>
                  setInquestInput("Validate Helium-3 lunar pyroxene abundance vs volcanic basalt extraction yields.")
                }
                className="px-2.5 py-0.5 rounded-full bg-[#141822] hover:bg-[#1C2230] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1C202A] whitespace-nowrap transition-colors"
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
      {drawerCitation && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-xl md:max-w-2xl h-full bg-[#0C0E14] border-l border-[#1C202A] p-7 sm:p-8 flex flex-col justify-between overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200"
            role="dialog"
            aria-modal="true"
          >
            <div className="space-y-6">
              
              {/* Drawer Masthead */}
              <div className="flex items-center justify-between pb-4 border-b border-[#1C202A]">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D4A373] shadow-[0_0_8px_#D4A373]" />
                  <span className="font-mono text-xs sm:text-sm font-bold text-[#F8FAFC]">
                    VERIFIED GROUND-TRUTH PASSAGE
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerCitation(null)}
                  className="p-2 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1C202A] transition-colors"
                  aria-label="Close evidence drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Metadata Pill Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-[#090A0D] border border-[#1C202A]">
                  <span className="text-[#64748B] block text-[10px] mb-1">SOURCE PUBLICATION</span>
                  <span className="text-[#F8FAFC] font-semibold">{drawerCitation.source}</span>
                </div>
                <div className="p-3 rounded-lg bg-[#090A0D] border border-[#1C202A]">
                  <span className="text-[#64748B] block text-[10px] mb-1">ADVERSARIAL ENTAILMENT</span>
                  <span className="text-[#10B981] font-bold">{drawerCitation.entailmentScore}% PASS</span>
                </div>
                <div className="p-3 rounded-lg bg-[#090A0D] border border-[#1C202A]">
                  <span className="text-[#64748B] block text-[10px] mb-1">PARAGRAPH LOCATOR</span>
                  <span className="text-[#D4A373] font-semibold">{drawerCitation.paragraph}</span>
                </div>
                <div className="p-3 rounded-lg bg-[#090A0D] border border-[#1C202A]">
                  <span className="text-[#64748B] block text-[10px] mb-1">VERIFIED BY</span>
                  <span className="text-[#94A3B8] truncate block">{drawerCitation.verifiedAt}</span>
                </div>
              </div>

              {/* Document Title */}
              <div className="space-y-1.5">
                <span className="font-mono text-xs text-[#64748B] uppercase tracking-wider block">
                  Article Title &amp; DOI
                </span>
                <h3 className="text-base font-bold text-[#F8FAFC] leading-snug">
                  {drawerCitation.title}
                </h3>
                <span className="font-mono text-xs text-[#D4A373] block">
                  DOI: {drawerCitation.doi}
                </span>
              </div>

              {/* Verbatim Ground Truth Highlighting with Generous Padding */}
              <div className="space-y-2">
                <span className="font-mono text-xs text-[#D4A373] uppercase tracking-wider block">
                  Extracted Corpus Passage (Ground Truth)
                </span>
                <div className="p-5 rounded-lg bg-[#090A0D] border border-[#1C202A] ring-1 ring-[#D4A373]/25 text-xs sm:text-sm font-sans text-[#E2E8F0] leading-relaxed">
                  <mark className="bg-[rgba(212,163,115,0.25)] text-[#F8FAFC] px-1.5 py-0.5 rounded">
                    {drawerCitation.highlight}
                  </mark>
                </div>
              </div>

              {/* Hypothesis Entailment Verification Logic */}
              <div className="space-y-2">
                <span className="font-mono text-xs text-[#64748B] uppercase tracking-wider block">
                  Adversarial Claim Tested
                </span>
                <div className="p-4 rounded-lg bg-[#090A0D] border border-[#1C202A] text-xs sm:text-sm font-sans text-[#CBD5E1] leading-relaxed">
                  &quot;{drawerCitation.claim}&quot;
                </div>
              </div>

              {/* Cryptographic SHA-256 Digest */}
              <div className="space-y-1.5">
                <span className="font-mono text-xs text-[#64748B] uppercase tracking-wider block">
                  SHA-256 Cryptographic Commit
                </span>
                <div className="p-3 rounded-lg bg-[#090A0D] border border-[#1C202A] font-mono text-xs text-[#64748B] break-all select-all">
                  {drawerCitation.hash}
                </div>
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="pt-6 border-t border-[#1C202A] flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setDrawerCitation(null)}
                className="px-5 py-2.5 rounded-md border border-[#1C202A] hover:border-[#475569] text-xs font-mono text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
              >
                Close Drawer
              </button>

              <button
                type="button"
                onClick={() => alert(`Opening source at DOI: https://doi.org/${drawerCitation.doi}`)}
                className="px-5 py-2.5 rounded-md bg-[#F8FAFC] hover:bg-[#FFFFFF] text-[#090A0D] font-mono text-xs font-semibold transition-colors flex items-center gap-2 uppercase cursor-pointer"
              >
                <span>External Source</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
