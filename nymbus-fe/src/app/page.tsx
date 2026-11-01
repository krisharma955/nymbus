"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { SpatialAesthetic } from "@/components/SpatialAesthetic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  ShieldCheck,
  CheckCircle2,
  Search,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Cpu,
  Layers,
  FileCheck,
  Activity,
  Terminal,
  Database,
  Lock,
  X,
  Copy,
  Check,
  GitBranch,
  FileText,
  Workflow,
  Zap,
  Globe,
  SlidersHorizontal,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  AlertTriangle,
  Flame,
  CheckCheck,
  Sun,
  Moon,
} from "lucide-react";

interface CitationProof {
  id: string;
  claim: string;
  source: string;
  passage: string;
  locator: string;
  hash: string;
  entailment: number;
  agent: string;
  timestamp: string;
}

const CITATION_PROOFS: CitationProof[] = [
  {
    id: "proof-501",
    claim:
      "Commonwealth Fusion Systems reported achieving a 20.1 Tesla central magnetic flux density using high-temperature superconducting (HTS) REBCO magnets.",
    source: "IEEE Transactions on Applied Superconductivity (Vol. 34)",
    passage:
      "The toroidal field model coil successfully attained a sustained central magnetic flux density of 20.1 Tesla at 20 Kelvin, validating the thermal and mechanical viability of REBCO tape conductors under high Lorentz forces.",
    locator: "Section 4.2 · Page 14 · REF: 501",
    hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    entailment: 99.4,
    agent: "VerificationAgent-03",
    timestamp: "15:20:18 UTC",
  },
  {
    id: "proof-502",
    claim:
      "Empirical SPARC tokamak confinement scaling projects scientific energy breakeven (Q = 9.1) yielding 140 MW net thermal fusion power.",
    source: "Journal of Plasma Physics (Cambridge University Press)",
    passage:
      "Using the empirical ITER H-mode confinement scaling IPB98(y,2), the baseline nominal plasma equilibrium produces an operating point of Q = 9.1 and total fusion power Pfus = 140 MW with DT fuel equivalent.",
    locator: "Section 2.1 · Equation 7 · REF: 502",
    hash: "8496380286350051e716acb8s72a950a5f8e0ac9925abd857989360a78a624e6",
    entailment: 98.8,
    agent: "AnalysisAgent-01",
    timestamp: "15:20:22 UTC",
  },
  {
    id: "proof-503",
    claim:
      "Neutron wall loading on the tungsten divertor requires replacement cycles under 2.8 full-power years due to ductile-to-brittle temperature threshold.",
    source: "Nuclear Materials & Energy (Elsevier Journal)",
    passage:
      "Displacement-per-atom calculations indicate that tungsten divertor monoblocks reach the ductile-to-brittle transition temperature threshold after 2.8 FPY under a 14 MeV neutron flux of 2 MW/m².",
    locator: "Table 4 · Divertor Lifetime Estimates §5.1",
    hash: "0a56b1986683477589c673a668765655c38cdab3ac9826354890282638402846",
    entailment: 97.6,
    agent: "ResearchAgent-02",
    timestamp: "15:20:25 UTC",
  },
];

const AGENT_SWARM = [
  {
    id: "O1",
    step: "01",
    name: "Orchestrator Agent",
    role: "DAG Decomposition",
    desc: "Deconstructs inquiries into an acyclic topological dependency graph with verified concurrency bounds.",
    status: "Operational",
    latency: "18ms",
    model: "DeepSeek-V3",
    metricLabel: "Sub-Tasks",
    metricValue: "5 Verified Nodes",
    metricHighlight: "0 Directed Cycles",
    logs: [
      "[15:20:01.102] Ingesting prompt: Fusion Scaling & Superconducting Magnet Stress",
      "[15:20:01.108] Constructing AST graph across 3 scientific preprint domains...",
      "[15:20:01.115] Acyclic verification: PASS (0 directed circular edges detected)",
      "[15:20:01.120] Topological order compiled: [O1 -> R1 -> V1 -> A1 -> D1]",
      "[15:20:01.124] Emitting execution broadcast to Research Swarm pool"
    ],
    payload: {
      task: "SPARC_HTS_AUDIT",
      subtasks: 5,
      dag_acyclic: true,
      compiler: "Topological-Sort-v2",
      memory_context_mb: 4.2
    },
    icon: Layers,
  },
  {
    id: "R1",
    step: "02",
    name: "Research Agent",
    role: "Corpus Retrieval",
    desc: "Executes parallel multi-source querying across Tavily, ArXiv, and Elsevier; extracts high-density passages into vector space.",
    status: "Active",
    latency: "340ms",
    model: "Tavily + Firecrawl",
    metricLabel: "Corpus Scraped",
    metricValue: "14 Sources Verified",
    metricHighlight: "82 Passages Ingested",
    logs: [
      "[15:20:01.442] Broadcasting semantic query to ArXiv API & Tavily Search",
      "[15:20:01.590] Fetched 14 peer-reviewed manuscripts (Elsevier, IEEE, ArXiv)",
      "[15:20:01.710] Splitting text into 82 candidate chunk embeddings...",
      "[15:20:01.782] Ingested into pgvector with cosine similarity > 0.88",
      "[15:20:01.815] Handshake complete: Vector shards ready for adversarial gate"
    ],
    payload: {
      query: "REBCO 20.1T TFMC",
      sources_scraped: 14,
      extracted_passages: 82,
      vector_index: "pgvector_hnsw",
      embedding_dim: 1536
    },
    icon: Database,
  },
  {
    id: "V1",
    step: "03",
    name: "Verification Agent",
    role: "Adversarial Entailment",
    desc: "Applies strict NLI (Natural Language Inference) premise-hypothesis matrix. Discards any assertion under 95% threshold.",
    status: "Guarded",
    latency: "120ms",
    model: "Claude 3.5 Sonnet",
    metricLabel: "NLI Confidence",
    metricValue: "99.4% Entailment",
    metricHighlight: "1 Speculative Discarded",
    logs: [
      "[15:20:01.902] Evaluating premise-hypothesis entailment for 6 claims",
      "[15:20:01.954] Claim 1 (20.1T TFMC coil): Entailment confidence = 99.4%",
      "[15:20:01.988] Claim 2 (Tungsten divertor): Entailment confidence = 97.6%",
      "[15:20:02.022] Speculative claim discarded (Score: 71.2% < 95% threshold)",
      "[15:20:02.048] Adversarial gate cleared: 5 entailing assertions passed"
    ],
    payload: {
      entailment_eval: 0.994,
      contradiction_risk: 0.002,
      strict_gate: "PASSED",
      shredded_claims: 1,
      verified_claims: 5
    },
    icon: ShieldCheck,
  },
  {
    id: "A1",
    step: "04",
    name: "Analysis Agent",
    role: "Cross-Synthesis",
    desc: "Cross-references numerical assertions across independent labs, detects subtle measurement deviations, and reconciles units.",
    status: "Operational",
    latency: "210ms",
    model: "GPT-4o Mini",
    metricLabel: "Numerical Variance",
    metricValue: "0.003 Deviation",
    metricHighlight: "All Units Reconciled",
    logs: [
      "[15:20:02.232] Cross-referencing magnetic field claims across MIT PSFC & Commonwealth Fusion",
      "[15:20:02.340] Dimensional analysis: 20.1 Tesla reconciled with 40.5kA operating current",
      "[15:20:02.410] Margin deviation calculated: 0.003 (Well within sigma bounds)",
      "[15:20:02.442] Cross-synthesis tensor sealed. Proceeding to dossier signing"
    ],
    payload: {
      cross_check_keys: ["IPB98(y,2)", "Pfus=140MW", "B_peak=20.1T"],
      deviation_margin: 0.003,
      consistency_rating: "NOMINAL",
      reconciled_units: ["Tesla", "FPY", "MW/m²"]
    },
    icon: Cpu,
  },
  {
    id: "D1",
    step: "05",
    name: "Report Agent",
    role: "Provenance Dossier",
    desc: "Seals findings into an immutable dossier with verbatim academic citations, page/table locators, and SHA-256 signatures.",
    status: "Ready",
    latency: "45ms",
    model: "Spring AI Monolith",
    metricLabel: "Cryptographic Seal",
    metricValue: "SHA-256 Anchored",
    metricHighlight: "3 Verbatim Locators",
    logs: [
      "[15:20:02.487] Formatting cryptographic evidence proof manifest",
      "[15:20:02.512] Computing SHA-256 digest: 0a56b1986683477589c673a6...",
      "[15:20:02.528] Appending 3 verbatim locators & citation proofs",
      "[15:20:02.532] Complete. Ready for executive review & export"
    ],
    payload: {
      cryptographic_seal: "0a56b1986683477589c673a668765655c38cdab3ac9826354890282638402846",
      citation_count: 3,
      verification_status: "VERIFIED_DOSSIER",
      export_formats: ["JSON", "PDF", "LaTeX", "Markdown"]
    },
    icon: FileCheck,
  },
];

export default function LandingPage() {
  const [inquiry, setInquiry] = useState(
    "Verify net energy gain claims and superconducting magnet stress tolerances in commercial magnetic confinement fusion."
  );
  const [activeProof, setActiveProof] = useState<CitationProof>(CITATION_PROOFS[0]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Creative Interactive States
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [simProgress, setSimProgress] = useState(0); // 0 to 100%
  const [activeSimulationStep, setActiveSimulationStep] = useState(0);
  const [activeAgentInspector, setActiveAgentInspector] = useState<number>(0);
  const [inspectorTab, setInspectorTab] = useState<"logs" | "payload" | "overview">("logs");
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [adversarialFilterOn, setAdversarialFilterOn] = useState(true);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nymbus-theme") as "dark" | "light" | null;
      if (saved) {
        setTheme(saved);
        if (saved === "light") {
          document.documentElement.classList.remove("dark");
          document.documentElement.setAttribute("data-theme", "light");
        } else {
          document.documentElement.classList.add("dark");
          document.documentElement.setAttribute("data-theme", "dark");
        }
      } else {
        const isDark = document.documentElement.classList.contains("dark");
        setTheme(isDark ? "dark" : "light");
        document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
      }
    } catch (e) {}
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    try {
      localStorage.setItem("nymbus-theme", nextTheme);
    } catch (e) {}
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(52, Math.min(textareaRef.current.scrollHeight, 220))}px`;
    }
  }, [inquiry]);

  // Smooth High-Performance Live Swarm Simulation Engine
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSimulating && !isPaused) {
      // 50ms ticks, total ~3250ms (~65 ticks) for a brisk, snappy, responsive cadence
      const tickDelta = 100 / 65;
      interval = setInterval(() => {
        setSimProgress((prev) => {
          const next = prev + tickDelta;
          if (next >= 100) {
            setIsSimulating(false);
            setActiveSimulationStep(4);
            return 100;
          }
          const currentStep = Math.min(4, Math.floor(next / 20));
          setActiveSimulationStep(currentStep);
          // Keep active inspector synced with active simulation step
          setActiveAgentInspector(currentStep);
          return next;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isSimulating, isPaused]);

  const startSimulation = () => {
    if (simProgress >= 100) {
      setSimProgress(0);
    }
    setIsPaused(false);
    setIsSimulating(true);
    setActiveSimulationStep(0);
    setActiveAgentInspector(0);
  };

  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const resetSimulation = () => {
    setIsSimulating(false);
    setIsPaused(false);
    setSimProgress(0);
    setActiveSimulationStep(0);
    setActiveAgentInspector(0);
  };

  const copyPayload = (payload: object) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="relative min-h-screen bg-[#FAFAF8] dark:bg-[#08090C] text-[#0D1117] dark:text-[#F6F8FA] font-sans selection:bg-[#B4783E] dark:selection:bg-[#E5B07A] selection:text-white dark:selection:text-zinc-950 transition-colors duration-200">
      
      {/* Background Subtle Drafting Grid */}
      <div className="fixed inset-0 bg-drafting-grid pointer-events-none opacity-20 z-0" />

      {/* ========================================================
          STICKY TOP NAVBAR (TIER-1 SAAS AESTHETIC)
         ======================================================== */}
      <header className="sticky top-0 z-40 w-full border-b border-[#E1E4EA]/80 dark:border-[#1E232F]/80 bg-[#FAFAF8]/90 dark:bg-[#08090C]/90 backdrop-blur-xl transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
          
          {/* Logo & Platform Tag */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex items-center gap-[3px]">
                <span className="w-1 h-3.5 bg-zinc-900 dark:bg-white rounded-full -rotate-12 shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                <span className="w-1 h-3.5 bg-[#D4A373] rounded-full -rotate-12" />
                <span className="w-1 h-3.5 bg-zinc-400 dark:bg-zinc-600 rounded-full -rotate-12" />
              </div>
              <span className="font-extrabold tracking-wider text-zinc-950 dark:text-white text-sm font-mono">
                NYMBUS
              </span>
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#B4783E]/10 dark:bg-[#E5B07A]/12 text-[#B4783E] dark:text-[#E5B07A] border border-[#B4783E]/20 dark:border-[#E5B07A]/25">
              PROVENANCE ENGINE
            </span>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
            <a
              href="#inquest"
              className="px-3 py-1.5 rounded-md hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-[#181C26] transition-all"
            >
              Inquest Console
            </a>
            <a
              href="#simulator"
              className="px-3 py-1.5 rounded-md hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all"
            >
              Live Swarm Engine
            </a>
            <a
              href="#shredder"
              className="px-3 py-1.5 rounded-md hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all"
            >
              Hallucination Filter
            </a>
            <a
              href="#dossier"
              className="px-3 py-1.5 rounded-md hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all"
            >
              Proof Dossier
            </a>
          </nav>

          {/* Status Bead & Action */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Light / Dark Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle light or dark theme"
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-[#E1E4EA] dark:border-[#1E232F] bg-white dark:bg-[#12151D] text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:border-[#B4783E]/40 dark:hover:border-[#E5B07A]/40 transition-all shadow-sm"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-700" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setTerminalOpen(!terminalOpen)}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100/80 dark:bg-[#12151D] border border-[#E1E4EA] dark:border-[#1E232F] text-[11px] font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:border-[#B4783E]/40 dark:hover:border-[#E5B07A]/40 transition-all"
            >
              <Terminal className="w-3.5 h-3.5 text-[#D4A373]" />
              <span>TERMINAL LOGS</span>
            </button>

            <Link href="/chat">
              <Button size="sm" variant="gold" className="gap-1.5 font-sans font-semibold">
                <span>Launch Inquest</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

        </div>
      </header>

      {/* ========================================================
          HERO SECTION WITH 3D ASTROLABE CENTERPIECE
         ======================================================== */}
            <section className="relative min-h-[85vh] flex flex-col justify-center items-center px-4 sm:px-8 py-16 sm:py-20 overflow-hidden">
            {/* Holographic Three.js Celestial Astrolabe (bottom fade disabled) */}
            <SpatialAesthetic hideBottomFade={true} />

            {/* Atmosphere glow tuned by parameter */}
            <div
              className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-b from-[#D4A373]/15 to-transparent blur-3xl pointer-events-none"
            />

            <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
              {/* Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-[#12151D]/90 border border-[#E1E4EA] dark:border-[#1E232F] text-xs font-mono text-zinc-700 dark:text-zinc-300 shadow-xl backdrop-blur-md mb-6">
                <span className="w-2 h-2 rounded-full bg-[#B4783E] dark:bg-[#E5B07A] shadow-[0_0_8px_rgba(229,176,122,0.6)]" />
                <span className="tracking-wider">AUTONOMOUS MULTI-AGENT PROVENANCE</span>
                <span className="text-zinc-400 dark:text-zinc-600">/</span>
                <span className="text-[#B4783E] dark:text-[#E5B07A] font-semibold">100% AUDITABLE</span>
              </div>

              {/* Monumental Headline */}
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-zinc-950 dark:text-white uppercase leading-[1.0]">
                Autonomous Research.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-950 via-zinc-800 to-[#B4783E] dark:from-white dark:via-zinc-200 dark:to-[#E5B07A]">
                  Absolute Provenance.
                </span>
              </h1>

              {/* Precise Subtitle */}
              <p className="mt-5 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed font-sans">
                Nymbus decomposes complex scientific and regulatory inquiries into an auditable DAG of subtasks. Specialized autonomous agents isolate verbatim source passages, enforce adversarial entailment, and bind every conclusion to cryptographic proof.
              </p>

              {/* Interactive Inquest Console */}
              <div id="inquest" className="w-full max-w-2xl mt-8">
                <div className="relative flex items-center gap-3 rounded-2xl border border-[#E1E4EA] dark:border-[#1E232F] bg-white dark:bg-[#12151D]/95 p-3 sm:p-3.5 shadow-xl dark:shadow-2xl backdrop-blur-xl focus-within:border-[#B4783E]/50 dark:focus-within:border-[#E5B07A]/50 focus-within:ring-2 focus-within:ring-[#B4783E]/10 dark:focus-within:ring-[#E5B07A]/10 transition-all">
                  <textarea
                    ref={textareaRef}
                    value={inquiry}
                    onChange={(e) => setInquiry(e.target.value)}
                    rows={2}
                    placeholder="Ask Nymbus to research, verify, or decompose an inquiry..."
                    className="flex-1 min-h-[52px] bg-transparent text-sm sm:text-base text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 font-sans focus:outline-none resize-none leading-relaxed overflow-hidden py-1 px-1.5"
                  />
                  <Link
                    href={`/chat?query=${encodeURIComponent(inquiry)}`}
                    className="shrink-0 flex items-center"
                  >
                    <button
                      type="button"
                      disabled={!inquiry.trim()}
                      className="h-10 px-4 rounded-xl bg-[#B4783E] dark:bg-[#E5B07A] hover:bg-[#9E6530] dark:hover:bg-[#edd0b0] text-white dark:text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md dark:shadow-[0_0_15px_rgba(229,176,122,0.3)] active:scale-95 disabled:opacity-40"
                    >
                      <span>Decompose</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  </Link>
                </div>

                {/* Preset Fast-Pick Prompt Pills */}
                <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 text-xs font-mono scrollbar-none">
                  <span className="text-zinc-600 dark:text-zinc-400 text-[11px] shrink-0 font-sans font-medium">Try:</span>
                  <button
                    type="button"
                    onClick={() => setInquiry("Audit ARC fusion reactor superconducting magnet stress models and thermal quench containment parameters.")}
                    className="px-2.5 py-1 rounded-md bg-white dark:bg-[#12151D] text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white border border-[#E1E4EA] dark:border-[#1E232F] hover:border-[#B4783E]/40 dark:hover:border-[#E5B07A]/40 transition-colors shrink-0 shadow-sm"
                  >
                    Fusion Scaling
                  </button>
                  <button
                    type="button"
                    onClick={() => setInquiry("Verify room-temperature superconductivity claims in modified lead-apatite crystals under ambient pressures.")}
                    className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 transition-colors shrink-0 shadow-sm"
                  >
                    Superconductors
                  </button>
                  <button
                    type="button"
                    onClick={() => setInquiry("Cross-examine trapped-ion quantum decoherence rates against neutral-atom optical lattice benchmark suites.")}
                    className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 transition-colors shrink-0 shadow-sm"
                  >
                    Quantum Fidelity
                  </button>
                </div>

                {/* High-End Architectural Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 text-left font-mono">
                  <div className="p-3.5 rounded-lg border border-[#E1E4EA] dark:border-[#1E232F] bg-white/90 dark:bg-[#12151D]/80 backdrop-blur-sm shadow-sm">
                    <div className="text-lg font-bold text-zinc-950 dark:text-white">5 AGENTS</div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Topological Swarm</div>
                  </div>
                  <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/50 backdrop-blur-sm shadow-sm">
                    <div className="text-lg font-bold text-[#B8824E] dark:text-[#D4A373]">&gt; 95%</div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Entailment Threshold</div>
                  </div>
                  <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/50 backdrop-blur-sm shadow-sm">
                    <div className="text-lg font-bold text-zinc-950 dark:text-white">100% LOC</div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Verbatim Locators</div>
                  </div>
                  <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/50 backdrop-blur-sm shadow-sm">
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">0 HAL</div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Adversarial Gate</div>
                  </div>
                </div>

              </div>

            </div>
          </section>

      {/* ========================================================
          CREATIVE SHOWSTOPPER: LIVE SWARM DAG SIMULATOR
         ======================================================== */}
      <section id="simulator" className="py-20 px-4 sm:px-8 border-t border-[#E1E4EA] dark:border-[#1E232F] bg-[#F3F4F6] dark:bg-[#0D0F14] relative overflow-hidden transition-colors duration-200">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 bg-gradient-to-b from-[#D4A373]/5 to-transparent blur-2xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          
          {/* Header & Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-6 border-b border-[#E1E4EA] dark:border-[#1E232F] gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#D4A373]/10 text-[#B8824E] dark:text-[#D4A373] border border-[#D4A373]/25">
                  <Activity className="w-3 h-3 text-[#D4A373]" />
                  TOPOLOGICAL SWARM
                </span>
                <span className="text-zinc-400 dark:text-zinc-600">·</span>
                <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                  {simProgress === 100 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Converged · All 5 nodes verified
                    </span>
                  ) : isSimulating && !isPaused ? (
                    <span className="text-zinc-900 dark:text-zinc-200">
                      Step 0{activeSimulationStep + 1}/05: {AGENT_SWARM[activeSimulationStep].name}
                    </span>
                  ) : isPaused ? (
                    <span className="text-amber-600 dark:text-amber-300">Paused at Step 0{activeSimulationStep + 1}</span>
                  ) : (
                    <span>5 autonomous agents compiled</span>
                  )}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
                Live Swarm DAG Simulation
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-sans mt-1">
                Visualizing deterministic token-passing across specialized agents with acyclic verification.
              </p>
            </div>

            {/* Minimal Simulator Controls */}
            <div className="flex items-center gap-2.5 shrink-0">
              {simProgress > 0 && (
                <button
                  type="button"
                  onClick={resetSimulation}
                  className="px-3 py-2 rounded-xl text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-900 border border-transparent hover:border-zinc-300 dark:hover:border-zinc-800 transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}

              {isSimulating ? (
                <button
                  type="button"
                  onClick={togglePause}
                  className={`h-10 px-5 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-2 border shadow-sm ${
                    isPaused
                      ? "bg-[#D4A373] text-black border-[#D4A373] font-semibold hover:bg-white"
                      : "bg-white dark:bg-zinc-900/90 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {isPaused ? (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Resume</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startSimulation}
                  className="h-10 px-5 rounded-xl bg-[#B4783E] dark:bg-[#E5B07A] hover:bg-[#9E6530] dark:hover:bg-[#edd0b0] text-white dark:text-zinc-950 text-xs font-mono font-bold transition-all flex items-center gap-2 shadow-md dark:shadow-lg dark:shadow-[#E5B07A]/20 active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{simProgress === 100 ? "Re-Run Swarm" : "Simulate Swarm"}</span>
                </button>
              )}
            </div>
          </div>

          {/* 5 Connected DAG Agent Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {AGENT_SWARM.map((agent, idx) => {
              const Icon = agent.icon;
              const isComputing = isSimulating && !isPaused && activeSimulationStep === idx;
              const isCompleted = simProgress === 100 || simProgress >= (idx + 1) * 20;
              const isSelected = activeAgentInspector === idx;

              return (
                <div
                  key={agent.id}
                  onClick={() => setActiveAgentInspector(idx)}
                  className={`text-left p-4 sm:p-5 rounded-2xl border transition-all duration-300 relative cursor-pointer min-h-[200px] flex flex-col justify-between group select-none overflow-hidden ${
                    isSelected
                      ? "border-[#B4783E] dark:border-[#E5B07A] bg-[#FCFBF9] dark:bg-[#161B26] shadow-xl shadow-[#B4783E]/10 dark:shadow-[#E5B07A]/15 ring-1 ring-[#B4783E]/30 dark:ring-[#E5B07A]/30"
                      : isComputing
                      ? "border-amber-500/80 bg-amber-50/30 dark:bg-[#161B26] shadow-lg shadow-amber-500/10"
                      : "border-[#E1E4EA] dark:border-[#1A1E29] bg-white dark:bg-[#10131B] hover:border-[#B4783E]/30 dark:hover:border-[#222736] hover:bg-zinc-50/50 dark:hover:bg-[#131722]"
                  }`}
                >
                  <div>
                    {/* Header Row: Step & Status Badge */}
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                            isSelected || isComputing
                              ? "bg-[#B4783E] dark:bg-[#E5B07A] text-white dark:text-zinc-950 shadow-md shadow-[#B4783E]/20 dark:shadow-[#E5B07A]/30"
                              : isCompleted
                              ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80"
                              : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400">
                          {agent.step}
                        </span>
                      </div>

                      {/* Status Tag */}
                      <span
                        className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border transition-all font-semibold ${
                          isComputing
                            ? "bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-500/60 text-amber-800 dark:text-amber-300 animate-pulse"
                            : isCompleted
                            ? "bg-emerald-100 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-500/60 text-emerald-800 dark:text-emerald-300"
                            : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500"
                        }`}
                      >
                        {isComputing
                          ? "COMPUTING"
                          : isCompleted
                          ? "✓ ENTAILED"
                          : "QUEUED"}
                      </span>
                    </div>

                    {/* Agent Identification */}
                    <div className="font-bold text-sm text-zinc-950 dark:text-white font-sans tracking-tight">
                      {agent.name}
                    </div>
                    <div className="text-[11px] text-[#B8824E] dark:text-[#D4A373] font-mono mt-0.5 font-medium">
                      {agent.role}
                    </div>

                    {/* Dynamic Metric Pill */}
                    <div className="mt-4 p-2.5 rounded-xl bg-zinc-50/70 dark:bg-[#0A0C12] border border-[#E1E4EA] dark:border-[#1A1E29] text-[11px] font-mono">
                      <div className="text-zinc-500 text-[9px] uppercase tracking-wider font-medium">{agent.metricLabel}</div>
                      <div className="text-zinc-900 dark:text-zinc-200 font-semibold mt-0.5 truncate">{agent.metricValue}</div>
                    </div>
                  </div>

                  {/* Footer Meta Strip */}
                  <div className="mt-4 pt-3 border-t border-[#E1E4EA] dark:border-[#1A1E29] flex items-center justify-between text-[11px] font-mono text-zinc-500">
                    <span className="truncate max-w-[100px]">{agent.model}</span>
                    <span className="text-[#B8824E] dark:text-[#D4A373] font-semibold">{agent.latency}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Agent Inspector & Live Telemetry Console */}
          <div className="rounded-2xl border border-[#E1E4EA] dark:border-[#1E232F] bg-white dark:bg-[#0E1118]/95 backdrop-blur-md overflow-hidden shadow-2xl font-mono text-xs mt-6">
            
            {/* Inspector Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-[#E1E4EA] dark:border-[#1E232F] bg-zinc-50/80 dark:bg-[#12151D] gap-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-[#D4A373]" />
                <span className="text-[#B8824E] dark:text-[#D4A373] font-bold">
                  STAGE 0{activeAgentInspector + 1}:
                </span>
                <span className="text-zinc-950 dark:text-white font-semibold">
                  {AGENT_SWARM[activeAgentInspector].name}
                </span>
                <span className="text-zinc-400 dark:text-zinc-600">·</span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  {AGENT_SWARM[activeAgentInspector].role}
                </span>
              </div>

              {/* Inspector Tab Switcher */}
              <div className="flex items-center gap-1 bg-zinc-200/60 dark:bg-zinc-900/90 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setInspectorTab("logs")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                    inspectorTab === "logs"
                      ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white font-bold shadow"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span>Telemetry Logs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab("payload")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                    inspectorTab === "payload"
                      ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white font-bold shadow"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-[#B8824E] dark:text-[#D4A373]" />
                  <span>State Payload</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab("overview")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                    inspectorTab === "overview"
                      ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white font-bold shadow"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200"
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                  <span>Specs</span>
                </button>
              </div>
            </div>

            {/* Inspector Tab Contents */}
            <div className="p-6">
            {inspectorTab === "logs" && (
              <div className="rounded-xl bg-[#F9F9FB] dark:bg-[#0A0C12] border border-[#E1E4EA] dark:border-[#1E232F] p-5 font-mono text-xs leading-relaxed text-[#0D1117] dark:text-[#E2E8F0] shadow-sm transition-colors duration-200">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E1E4EA] dark:border-[#1E232F] text-[11px] text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 font-mono text-zinc-600 dark:text-zinc-400">nymbus-swarm://{AGENT_SWARM[activeAgentInspector].id.toLowerCase()}/telemetry.log</span>
                  </div>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                    STREAM ACTIVE
                  </span>
                </div>

                <div className="space-y-2.5">
                  {AGENT_SWARM[activeAgentInspector].logs.map((logLine, logIdx) => (
                    <div key={logIdx} className="flex items-start gap-3">
                      <span className="text-[#B4783E] dark:text-[#E5B07A] select-none font-bold">&gt;</span>
                      <span className="font-mono">
                        <span className="text-zinc-500 dark:text-zinc-400">{logLine.slice(0, 14)}</span>
                        <span className="text-zinc-900 dark:text-zinc-200">{logLine.slice(14)}</span>
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 pt-1.5">
                    <span className="text-[#B4783E] dark:text-[#E5B07A] select-none font-bold">&gt;</span>
                    <span className="inline-block w-2 h-4 bg-[#B4783E] dark:bg-[#E5B07A] animate-pulse" />
                  </div>
                </div>
              </div>
            )}

            {inspectorTab === "payload" && (
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">
                    IMMUTABLE STATE GRAPH ENVELOPE
                  </span>
                  <button
                    type="button"
                    onClick={() => copyPayload(AGENT_SWARM[activeAgentInspector].payload)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-mono transition-colors shadow-sm border border-zinc-200 dark:border-zinc-700"
                  >
                    {copiedPayload ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Copy Payload</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-5 rounded-xl bg-[#F9F9FB] dark:bg-[#0A0C12] border border-[#E1E4EA] dark:border-[#1E232F] text-xs text-[#B4783E] dark:text-[#E5B07A] overflow-x-auto leading-relaxed shadow-sm">
                  {JSON.stringify(AGENT_SWARM[activeAgentInspector].payload, null, 2)}
                </pre>
              </div>
            )}

            {inspectorTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-5 rounded-xl bg-[#F9F9FB] dark:bg-[#0A0C12] border border-[#E1E4EA] dark:border-[#1E232F]">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">
                    PRIMARY RESPONSIBILITY & HEURISTICS
                  </span>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 font-sans mt-2.5 leading-relaxed">
                    {AGENT_SWARM[activeAgentInspector].desc}
                  </p>
                  <div className="mt-5 pt-3.5 border-t border-[#E1E4EA] dark:border-[#1E232F] flex items-center justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400">Deterministic Confidence:</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">&gt; 98.5%</span>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-[#F9F9FB] dark:bg-[#0A0C12] border border-[#E1E4EA] dark:border-[#1E232F]">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">
                    RUNTIME INFERENCE ARCHITECTURE
                  </span>
                  <div className="space-y-2.5 mt-2.5 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-[#E1E4EA] dark:border-[#1E232F]">
                      <span className="text-zinc-500 dark:text-zinc-400">Model Engine:</span>
                      <span className="text-zinc-950 dark:text-white font-semibold">{AGENT_SWARM[activeAgentInspector].model}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-[#E1E4EA] dark:border-[#1E232F]">
                      <span className="text-zinc-500 dark:text-zinc-400">Round-Trip Latency:</span>
                      <span className="text-[#B4783E] dark:text-[#E5B07A] font-semibold">{AGENT_SWARM[activeAgentInspector].latency}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-[#E1E4EA] dark:border-[#1E232F]">
                      <span className="text-zinc-500 dark:text-zinc-400">Metric Highlight:</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{AGENT_SWARM[activeAgentInspector].metricHighlight}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-zinc-500 dark:text-zinc-400">DAG Concurrency:</span>
                      <span className="text-zinc-700 dark:text-zinc-300">Synchronous Acyclic</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          </div>

        </div>
      </section>

      {/* ========================================================
          CREATIVE SHOWSTOPPER: THE HALLUCINATION SHREDDER
         ======================================================== */}
      <section id="shredder" className="py-20 px-4 sm:px-8 border-t border-[#E1E4EA] dark:border-[#1E232F] bg-[#FAFAF8] dark:bg-[#08090C] transition-colors duration-200">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-mono font-bold tracking-wider text-[#B8824E] dark:text-[#D4A373] uppercase flex items-center justify-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              THE ADVERSARIAL ENTAILMENT SHREDDER
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white uppercase tracking-tight mt-1">
              Visualizing Zero Hallucination
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-2 font-sans">
              Toggle the adversarial filter to see how Nymbus purges unsubstantiated LLM assumptions and locks in verifiable ground-truth evidence.
            </p>

            {/* Interactive Toggle Pill */}
            <div className="mt-6 inline-flex items-center gap-3 p-1.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md">
              <button
                type="button"
                onClick={() => setAdversarialFilterOn(false)}
                className={`px-4 py-1.5 rounded-full text-xs font-mono font-semibold transition-all ${
                  !adversarialFilterOn
                    ? "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow"
                    : "text-zinc-600 dark:text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
                }`}
              >
                Raw LLM (Unfiltered)
              </button>
              <button
                type="button"
                onClick={() => setAdversarialFilterOn(true)}
                className={`px-4 py-1.5 rounded-full text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                  adversarialFilterOn
                    ? "bg-[#D4A373] text-black shadow-md font-bold"
                    : "text-zinc-600 dark:text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Nymbus Adversarial Gate (ON)</span>
              </button>
            </div>
          </div>

          {/* Interactive Text Comparison Box */}
          <div className="p-6 sm:p-8 rounded-2xl border border-[#E1E4EA] dark:border-[#1E232F] bg-white dark:bg-[#12151D] font-sans leading-relaxed shadow-xl dark:shadow-2xl relative overflow-hidden transition-colors duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#E1E4EA] dark:border-[#1E232F] font-mono text-xs mb-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-950 dark:text-white">TOPIC: REBCO Superconducting Magnets</span>
              </div>
              <span
                className={`font-mono text-[10px] font-bold px-2.5 py-0.5 rounded border ${
                  adversarialFilterOn
                    ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                    : "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800"
                }`}
              >
                {adversarialFilterOn ? "100% GROUND-TRUTH ENTAILED" : "UNVALIDATED PROBABILISTIC TEXT"}
              </span>
            </div>

            <div className="space-y-4 text-sm sm:text-base text-zinc-700 dark:text-zinc-300">
              <p>
                In 2021, Commonwealth Fusion Systems successfully energized their toroidal field model coil.{" "}
                <span className="text-zinc-950 dark:text-white bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700/60 font-medium">
                  The coil attained a sustained central magnetic flux density of 20.1 Tesla at 20 Kelvin
                </span>
                <span className="inline-flex items-center ml-1.5 px-2 py-0.5 rounded bg-[#D4A373] text-zinc-950 font-mono text-xs font-bold">
                  [§ 4.2 REF 501]
                </span>
                .
              </p>

              {/* Hallucinated Sentence with Conditional Shredding */}
              <p>
                {adversarialFilterOn ? (
                  <span className="relative inline-block text-zinc-400 dark:text-zinc-600 line-through decoration-rose-500 decoration-2 italic">
                    The magnet was subsequently deployed in commercial grid operations by November 2022 producing 500 megawatts.
                    <span className="ml-2 not-italic text-[10px] font-mono text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 rounded border border-rose-300 dark:border-rose-800 uppercase font-bold">
                      [SHREDDED // 0% SOURCE ENTAILMENT]
                    </span>
                  </span>
                ) : (
                  <span className="text-rose-900 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800/60">
                    The magnet was subsequently deployed in commercial grid operations by November 2022 producing 500 megawatts.
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-mono ml-2">(Unchecked LLM Hallucination)</span>
                  </span>
                )}
              </p>

              <p>
                Empirical SPARC confinement models confirm that{" "}
                <span className="text-zinc-950 dark:text-white bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700/60 font-medium">
                  nominal equilibrium predicts scientific energy breakeven (Q = 9.1) yielding 140 MW net thermal fusion power
                </span>
                <span className="inline-flex items-center ml-1.5 px-2 py-0.5 rounded bg-[#D4A373] text-zinc-950 font-mono text-xs font-bold">
                  [§ 2.1 REF 502]
                </span>
                .
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================
          SECTION 4: VERIFIABLE GROUND-TRUTH DOSSIER (LIVE AUDIT)
         ======================================================== */}
      <section id="dossier" className="relative py-20 px-4 sm:px-8 border-t border-[#E1E4EA] dark:border-[#1E232F] bg-[#F3F4F6] dark:bg-[#0D0F14] transition-colors duration-200">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-[#E1E4EA] dark:border-[#1E232F]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-[#B8824E] dark:text-[#D4A373]" />
                <span className="text-xs font-mono font-bold tracking-wider text-[#B8824E] dark:text-[#D4A373] uppercase">
                  VERIFIABLE GROUND-TRUTH DOSSIER
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white uppercase tracking-tight">
                Inspect Source Passages & Cryptographic Proof
              </h2>
            </div>
            <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-2 md:mt-0">
              Click any citation badge <span className="text-[#B8824E] dark:text-[#D4A373] font-bold">[1]</span>,{" "}
              <span className="text-[#B8824E] dark:text-[#D4A373] font-bold">[2]</span>,{" "}
              <span className="text-[#B8824E] dark:text-[#D4A373] font-bold">[3]</span> to inspect source passages
            </p>
          </div>

          {/* Dossier Card Container */}
          <div className="relative">
            <Card className="border-[#E1E4EA] dark:border-[#1E232F] bg-white dark:bg-[#12151D] p-6 sm:p-8 shadow-xl dark:shadow-2xl transition-colors duration-200">
              
              {/* Dossier Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 gap-2 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="gold">DOSSIER #501</Badge>
                    <Badge variant="success">CONFIRMED ENTAILMENT</Badge>
                  </div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white mt-1.5 font-sans">
                    Magnetic Confinement Fusion: SPARC High-Field Confinement Assessment
                  </h3>
                </div>
                <div className="text-xs font-mono text-zinc-500">
                  SHA-256 PROVENANCE GUARANTEE
                </div>
              </div>

              {/* Dossier Synthesized Body with Clickable Citations */}
              <div className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans max-w-4xl">
                <p>
                  Recent magnet engineering results have fundamentally reshaped tokamak confinement scaling.{" "}
                  <span className="text-zinc-950 dark:text-white bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700/60 font-medium">
                    Commonwealth Fusion Systems achieved sustained 20.1 Tesla central magnetic flux density using rare-earth barium copper oxide (REBCO) conductors
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveProof(CITATION_PROOFS[0]);
                      setDrawerOpen(true);
                    }}
                    className="inline-flex items-center ml-1.5 px-2 py-0.5 rounded bg-[#B4783E] dark:bg-[#E5B07A] text-white dark:text-zinc-950 font-mono font-bold hover:bg-[#9E6530] dark:hover:bg-[#edd0b0] transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    [1]
                  </button>
                  , confirming that compact high-field machines achieve volumetric power densities exceeding traditional ITER configurations.
                </p>

                <p>
                  Empirical models calibrated against the SPARC baseline confirm that{" "}
                  <span className="text-zinc-950 dark:text-white bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700/60 font-medium">
                    confinement scaling predicts scientific energy breakeven (Q = 9.1) yielding 140 MW net thermal fusion power
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveProof(CITATION_PROOFS[1]);
                      setDrawerOpen(true);
                    }}
                    className="inline-flex items-center ml-1.5 px-2 py-0.5 rounded bg-[#D4A373] text-zinc-950 font-mono font-bold hover:bg-[#c49260] dark:hover:bg-white transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    [2]
                  </button>
                  . However, material engineering constraints remain active, specifically where{" "}
                  <span className="text-zinc-950 dark:text-white bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700/60 font-medium">
                    neutron wall loading on the tungsten divertor requires replacement cycles under 2.8 full-power years
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveProof(CITATION_PROOFS[2]);
                      setDrawerOpen(true);
                    }}
                    className="inline-flex items-center ml-1.5 px-2 py-0.5 rounded bg-[#D4A373] text-zinc-950 font-mono font-bold hover:bg-[#c49260] dark:hover:bg-white transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    [3]
                  </button>
                  .
                </p>
              </div>

              {/* Quick Citations Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800/80">
                {CITATION_PROOFS.map((proof, idx) => (
                  <button
                    key={proof.id}
                    type="button"
                    onClick={() => {
                      setActiveProof(proof);
                      setDrawerOpen(true);
                    }}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                      activeProof.id === proof.id
                        ? "border-[#D4A373] bg-[#D4A373]/10"
                        : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                      <span className="text-[#B8824E] dark:text-[#D4A373] font-bold">[{idx + 1}] {proof.locator}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{proof.entailment}%</span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 font-sans">{proof.claim}</p>
                  </button>
                ))}
              </div>

            </Card>

            {/* SLIDE-OVER EVIDENCE DRAWER */}
            <div
              className={`fixed inset-y-0 right-0 w-full sm:w-[460px] bg-white dark:bg-[#0F121A] border-l border-[#E1E4EA] dark:border-[#1E232F] shadow-2xl p-6 z-50 transform transition-transform duration-300 ease-out flex flex-col justify-between font-mono ${
                drawerOpen ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <div>
                {/* Drawer Top */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#B8824E] dark:text-[#D4A373]" />
                    <span className="text-xs font-bold text-zinc-950 dark:text-white">EVIDENCE AUDIT DRAWER</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDrawerOpen(false)}
                    className="h-8 w-8 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Claim Statement */}
                <div className="mt-5">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    ATOMIC CLAIM ASSERTION
                  </span>
                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white font-sans mt-1.5 leading-relaxed">
                    {activeProof.claim}
                  </div>
                </div>

                {/* Ground Truth Passage */}
                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#B8824E] dark:text-[#D4A373] uppercase tracking-wider font-bold">
                      VERBATIM SOURCE PASSAGE
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      {activeProof.entailment}% VERIFIED
                    </span>
                  </div>
                  <div className="p-3.5 rounded-lg bg-zinc-50/80 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 font-sans italic mt-1.5 leading-relaxed">
                    &ldquo;{activeProof.passage}&rdquo;
                  </div>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block">
                    {activeProof.locator}
                  </span>
                </div>

                {/* Metadata Details */}
                <div className="mt-6 space-y-2 text-xs border-t border-zinc-200 dark:border-zinc-800/80 pt-4 text-zinc-600 dark:text-zinc-400">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Source:</span>
                    <span className="text-zinc-300 truncate max-w-[240px]">
                      {activeProof.source}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Auditing Agent:</span>
                    <span className="text-[#D4A373] font-bold">{activeProof.agent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Timestamp:</span>
                    <span className="text-zinc-300">{activeProof.timestamp}</span>
                  </div>
                </div>

                {/* Cryptographic Digest */}
                <div className="mt-5 p-3 rounded bg-zinc-950 border border-zinc-800">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                    <span>SHA-256 PROVENANCE DIGEST</span>
                    <button
                      type="button"
                      onClick={() => copyHash(activeProof.hash)}
                      className="text-zinc-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedHash ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-[11px] text-[#D4A373] break-all">
                    {activeProof.hash}
                  </div>
                </div>
              </div>

              {/* Close Action */}
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ENTAILED IN GROUND TRUTH
                </span>
                <Button size="sm" variant="secondary" onClick={() => setDrawerOpen(false)}>
                  Close
                </Button>
              </div>

            </div>

            {/* Backdrop */}
            {drawerOpen && (
              <div
                onClick={() => setDrawerOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
              />
            )}

          </div>

        </div>
      </section>

      {/* ========================================================
          SLIDE-OVER RAW FORENSIC TERMINAL
         ======================================================== */}
      {terminalOpen && (
        <div className="fixed bottom-4 right-4 w-full sm:w-[500px] bg-black/95 border border-zinc-700 rounded-xl shadow-2xl p-4 font-mono text-xs z-50 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-[11px] text-zinc-400">
            <div className="flex items-center gap-2 text-white">
              <Terminal className="w-3.5 h-3.5 text-[#D4A373]" />
              <span>NYMBUS KERNEL STREAM // SSE 200</span>
            </div>
            <button
              type="button"
              onClick={() => setTerminalOpen(false)}
              className="text-zinc-500 hover:text-white"
            >
              [ESC]
            </button>
          </div>

          <div className="mt-3 space-y-1.5 text-[11px] text-zinc-400 max-h-56 overflow-y-auto">
            <div className="text-zinc-600">[00:00:01] boot: topology graph validator ready</div>
            <div className="text-emerald-400">[00:00:02] tavily: 14 documents fetched across IEEE & Nature</div>
            <div className="text-zinc-400">[00:00:03] pgvector: cosine similarity threshold = 0.884</div>
            <div className="text-[#D4A373]">[00:00:04] entailment_gate: evaluated 82 assertions, 79 confirmed, 3 discarded</div>
            <div className="text-white">[00:00:05] attestation: SHA256 digest generated e3b0c44298fc1c14</div>
          </div>
        </div>
      )}

      {/* ========================================================
          CLOSING CTA & FOOTER
         ======================================================== */}
      <section className="py-20 px-4 sm:px-8 border-t border-[#E1E4EA] dark:border-[#1E232F] bg-[#FAFAF8] dark:bg-[#08090C] text-center transition-colors duration-200">
        <div className="max-w-3xl mx-auto flex flex-col items-center">
          <Badge variant="gold" className="mb-4">READY TO CONDUCT AUDITABLE RESEARCH?</Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-zinc-950 dark:text-white uppercase tracking-normal [word-spacing:0.25em] leading-[1.25] mt-2 mb-4">
            Eliminate Hallucination in Deep Inquiry
          </h2>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 max-w-xl font-sans leading-relaxed">
            Launch an inquest now to watch the 5-agent swarm decompose subtasks, extract verbatim passages, and prove every conclusion in real time.
          </p>

          <div className="mt-8 flex items-center gap-4">
            <Link href="/chat">
              <Button size="lg" variant="gold" className="gap-2 font-sans font-bold">
                <span>Open Inquest Console</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-12 px-4 sm:px-8 border-t border-[#E1E4EA] dark:border-[#1E232F] bg-white dark:bg-[#060709] text-xs font-mono text-zinc-500 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#D4A373]" />
            <span className="font-bold text-zinc-950 dark:text-white">NYMBUS PLATFORM</span>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <span>NEXT.JS 16 · REACT 19 · THREE.JS · TAILWIND V4</span>
          </div>

          <div className="flex items-center gap-6 text-zinc-600 dark:text-zinc-400">
            <a href="#inquest" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
              Console
            </a>
            <a href="#simulator" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
              Swarm
            </a>
            <a href="#shredder" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
              Filter
            </a>
            <a href="#dossier" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
              Dossier
            </a>
            <Link href="/chat" className="text-[#B8824E] dark:text-[#D4A373] font-bold hover:underline">
              Enter Inquest Stream &rarr;
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
