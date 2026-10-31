"use client";

import React, { useState } from "react";
import Link from "next/link";
import { IsometricLedger } from "@/components/IsometricLedger";
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Search,
  ChevronDown,
  Layers,
  FileText,
  Activity,
  Terminal,
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
    claim: "Commonwealth Fusion Systems reported achieving a 20.1 Tesla central magnetic flux density using high-temperature superconducting (HTS) REBCO magnets.",
    source: "IEEE Transactions on Applied Superconductivity (Vol. 34)",
    passage: "The toroidal field model coil successfully attained a sustained central central magnetic flux density of 20.1 Tesla at 20 Kelvin, validating the thermal and mechanical viability of REBCO tape conductors under high Lorentz forces.",
    locator: "Section 4.2 · Page 14 · REF: 501",
    hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    entailment: 99.4,
    agent: "VerificationAgent-03",
    timestamp: "15:20:18 UTC",
  },
  {
    id: "proof-502",
    claim: "Empirical SPARC tokamak confinement scaling projects scientific energy breakeven (Q = 9.1) yielding 140 MW net thermal fusion power.",
    source: "Journal of Plasma Physics (Cambridge University Press)",
    passage: "Using the empirical ITER H-mode confinement scaling IPB98(y,2), the baseline nominal plasma equilibrium produces an operating point of Q = 9.1 and total fusion power Pfus = 140 MW with DT fuel equivalent.",
    locator: "Section 2.1 · Equation 7 · REF: 502",
    hash: "8496380286350051e716acb8s72a950a5f8e0ac9925abd857989360a78a624e6",
    entailment: 98.8,
    agent: "AnalysisAgent-01",
    timestamp: "15:20:22 UTC",
  },
  {
    id: "proof-503",
    claim: "Neutron wall loading on the tungsten divertor requires replacement cycles under 2.8 full-power years due to ductile-to-brittle temperature threshold.",
    source: "Nuclear Materials & Energy (Elsevier Journal)",
    passage: "Displacement-per-atom calculations indicate that tungsten divertor monoblocks reach the ductile-to-brittle transition temperature threshold after 2.8 FPY under a 14 MeV neutron flux of 2 MW/m².",
    locator: "Table 4 · Divertor Lifetime Estimates §5.1",
    hash: "0a56b1986683477589c673a668765655c38cdab3ac9826354890282638402846",
    entailment: 97.6,
    agent: "ResearchAgent-02",
    timestamp: "15:20:25 UTC",
  },
];

const AGENT_SWARM = [
  { id: "O1", name: "OrchestratorAgent", role: "DAG Decomposition", detail: "Plans topological execution graph & cycle check" },
  { id: "R1", name: "ResearchAgent", role: "Corpus Retrieval", detail: "Tavily web extraction & vector passage isolation" },
  { id: "V1", name: "VerificationAgent", role: "Entailment Gate", detail: "Validates claim assertion against raw text (>95%)" },
  { id: "A1", name: "AnalysisAgent", role: "Evidence Synthesis", detail: "Cross-subtask calculation & contradiction defense" },
  { id: "D1", name: "ReportAgent", role: "Provenance Dossier", detail: "Binds findings to immutable SHA-256 locator tags" },
];

export default function LandingPage() {
  const [inquiry, setInquiry] = useState(
    "Verify net energy gain claims and superconducting magnet stress tolerances in commercial magnetic confinement fusion."
  );
  const [activeProof, setActiveProof] = useState<CitationProof>(CITATION_PROOFS[0]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hovered3dCard, setHovered3dCard] = useState<number | null>(null);

  return (
    <div className="relative min-h-screen bg-[#090A0D] text-[#F8FAFC] font-sans selection:bg-[#D4A373] selection:text-[#090A0D] overflow-x-hidden">
      
      {/* Background Architectural Drafting Caliper Grid */}
      <div className="absolute inset-0 bg-drafting-grid pointer-events-none opacity-40 z-0" />

      {/* ========================================================
          VIEWPORT 1: THE SPATIAL LEDGER (HERO & 3D ISOMETRIC PLANE)
         ======================================================== */}
      <section className="relative min-h-screen flex flex-col justify-between border-b border-[#1C202A] overflow-hidden">
        
        {/* Interactive 3D Isometric Drafting Grid Canvas */}
        <IsometricLedger onHoverCard={setHovered3dCard} />

        {/* TOP ARCHITECTURAL MASTHEAD */}
        <header className="relative z-20 border-b border-[#1C202A]/80 bg-[#090A0D]/90 backdrop-blur-md">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between font-mono text-xs">
            
            {/* Wordmark */}
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 group">
                <span className="font-extrabold tracking-widest text-[#F8FAFC] text-base">
                  NYMBUS
                </span>
                <span className="text-[#64748B] text-[11px] hidden sm:inline">
                  // SPATIAL PROVENANCE LEDGER
                </span>
              </Link>
            </div>

            {/* Clean Navigation Links */}
            <nav className="hidden md:flex items-center gap-8 text-[#94A3B8] text-xs font-medium">
              <a href="#ledger" className="hover:text-[#F8FAFC] transition-colors">
                Overview
              </a>
              <a href="#dossier" className="hover:text-[#F8FAFC] transition-colors">
                Dossier
              </a>
              <a href="#pipeline" className="hover:text-[#F8FAFC] transition-colors">
                Swarm Architecture
              </a>
              <a href="#specs" className="hover:text-[#F8FAFC] transition-colors">
                Specifications
              </a>
            </nav>

            {/* Status Bead & Actions */}
            <div className="flex items-center gap-4">
              {/* Warm Amber Glowing Status Bead */}
              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#13161D] border border-[#1C202A] text-[11px] text-[#94A3B8]">
                <span className="w-2 h-2 rounded-full bg-[#D4A373] shadow-[0_0_8px_#D4A373]" />
                <span className="hidden sm:inline">SYSTEM: ACTIVE</span>
              </div>

              <Link
                href="/login"
                className="px-3.5 py-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1C202A] hover:border-[#383F4E] transition-all"
              >
                Sign In
              </Link>
              <Link
                href="/app"
                className="px-4 py-1.5 text-xs font-bold tracking-wider bg-[#F8FAFC] hover:bg-[#FFFFFF] text-[#090A0D] transition-all flex items-center gap-1.5 uppercase"
              >
                <span>Launch Inquest</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </header>

        {/* Left Legibility Scrim (Confined to left column so typography is razor-sharp while right 3D space is 100% open) */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-full lg:w-[48%] bg-gradient-to-r from-[#090A0D]/95 via-[#090A0D]/70 to-transparent z-[5]" />

        {/* HERO BODY */}
        <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-8 w-full flex-1 flex flex-col justify-between py-8 pointer-events-none">
          
          {/* Monumental Headline */}
          <div className="flex flex-col gap-3 max-w-3xl pt-2 pointer-events-auto">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.04em] text-[#F8FAFC] uppercase leading-[0.98]">
              Autonomous Research.<br />
              Absolute Provenance.
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] max-w-lg leading-relaxed mt-1">
              Nymbus replaces probabilistic chat summaries with an inspectable spatial ledger. Autonomous agents plan execution graphs, isolate ground-truth source passages, and enforce adversarial entailment before conclusions are synthesized.
            </p>
          </div>

          {/* Understated 3D Ledger Status Chip */}
          <div className="self-end pointer-events-auto hidden md:block">
            <div className="px-3 py-1.5 bg-[#0E1015]/90 border border-[#1C202A] font-mono text-[10px] text-[#94A3B8] backdrop-blur-md flex items-center gap-2.5 transition-all">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4A373] animate-pulse" />
              <span className="tracking-wider">
                {hovered3dCard === 0 && "NODE #1: ACTIVE SUBTASK DAG // 01 · 3/3 VERIFIED"}
                {hovered3dCard === 1 && "NODE #2: HYPOTHESIS & CLAIM · ENTAILMENT 99.4%"}
                {hovered3dCard === 2 && "NODE #3: VERIFIED SOURCE EXCERPT · § 14.2 REF-502"}
                {hovered3dCard === 3 && "NODE #4: PROVENANCE LEDGER · SHA-256 CONFIRMED"}
                {hovered3dCard === null && "3D ARCHITECTURAL SPATIAL LEDGER · 4 NODES SYNCED"}
              </span>
            </div>
          </div>

          {/* Bottom Inquiry Console & Metric Strip */}
          <div className="flex flex-col gap-4 w-full max-w-3xl pointer-events-auto">
            {/* Sleek Minimal Query Bar */}
            <div className="p-2.5 bg-[#0E1015]/95 border border-[#1C202A] shadow-2xl backdrop-blur-md">
              <div className="relative flex items-center mb-2.5">
                <div className="absolute left-3 text-[#D4A373]">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={inquiry}
                  onChange={(e) => setInquiry(e.target.value)}
                  placeholder="Enter research inquiry to decompose..."
                  className="w-full pl-9 pr-3 py-2.5 bg-[#090A0D] border border-[#1C202A] text-xs sm:text-sm text-[#F8FAFC] placeholder-[#4B5563] font-mono focus:outline-none focus:border-[#D4A373] transition-colors"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 font-mono text-[10px]">
                {/* Presets */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-[#94A3B8]">
                  <span className="text-[#4B5563]">INQUESTS:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setInquiry("Verify net-energy scaling and REBCO magnet stress tolerances in compact SPARC tokamaks.")
                    }
                    className="px-2 py-0.5 bg-[#13161D] hover:bg-[#1C202A] hover:text-white transition-colors border border-[#1C202A] whitespace-nowrap"
                  >
                    Fusion Scalings
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setInquiry("Evaluate room-temperature superconductor diamagnetic phase transition claims in preprints.")
                    }
                    className="px-2 py-0.5 bg-[#13161D] hover:bg-[#1C202A] hover:text-white transition-colors border border-[#1C202A] whitespace-nowrap"
                  >
                    Superconductors
                  </button>
                </div>

                <Link
                  href={`/login?query=${encodeURIComponent(inquiry)}`}
                  className="w-full sm:w-auto px-5 py-2 bg-[#F8FAFC] hover:bg-[#FFFFFF] text-[#090A0D] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <span>DECOMPOSE SUBTASKS</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* 4 Core Metrics */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#1C202A] font-mono text-xs">
              <div>
                <div className="text-base font-bold text-[#F8FAFC]">5 SWARM</div>
                <div className="text-[9px] text-[#64748B]">Specialized Agents</div>
              </div>
              <div>
                <div className="text-base font-bold text-[#D4A373]">0 HAL</div>
                <div className="text-[9px] text-[#64748B]">Entailment Gate</div>
              </div>
              <div>
                <div className="text-base font-bold text-[#F8FAFC]">100% LOC</div>
                <div className="text-[9px] text-[#64748B]">Source Passages</div>
              </div>
              <div>
                <div className="text-base font-bold text-[#D4A373]">&lt; 0.42ms</div>
                <div className="text-[9px] text-[#64748B]">Kernel Latency</div>
              </div>
            </div>
          </div>

        </div>

        {/* Viewport Transition Anchor */}
        <div className="relative z-20 py-2.5 border-t border-[#1C202A] flex items-center justify-center font-mono text-[10px] text-[#64748B]">
          <a href="#dossier" className="group flex items-center gap-1.5 hover:text-[#D4A373] transition-colors">
            <span>SCROLL TO PROVENANCE DOSSIER & MULTI-AGENT SWARM</span>
            <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
          </a>
        </div>

      </section>

      {/* ========================================================
          VIEWPORT 2: PROVENANCE DOSSIER & SWARM PIPELINE
         ======================================================== */}
      <section id="dossier" className="relative min-h-screen flex flex-col justify-between p-4 sm:p-8 bg-[#090A0D] border-b border-[#1C202A]">
        
        <div className="max-w-[1440px] mx-auto w-full flex-1 flex flex-col justify-between gap-6 relative z-10">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#1C202A] pb-3">
            <div>
              <span className="text-[10px] font-mono text-[#D4A373] uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4A373]" />
                VERIFIABLE GROUND-TRUTH DOSSIER
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[#F8FAFC] mt-0.5">
                Audit Source Passages & Proof
              </h2>
            </div>
            <div className="font-mono text-[10px] text-[#64748B] mt-1 sm:mt-0">
              CLICK ANY CITATION [1], [2], [3] TO OPEN PROOF DRAWER
            </div>
          </div>

          {/* MAIN STAGE: Research Dossier & Slide-Out Proof Drawer */}
          <div className="relative bg-[#0E1015] border border-[#1C202A] p-6 shadow-2xl overflow-hidden min-h-[360px]">
            
            {/* Dossier Top Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1C202A] mb-5 font-mono text-xs">
              <div>
                <span className="text-[10px] text-[#D4A373] font-bold">
                  DOSSIER #501 // CONFIRMED ENTAILMENT
                </span>
                <h3 className="text-sm font-bold text-[#F8FAFC] font-sans mt-0.5">
                  Magnetic Confinement Fusion: SPARC High-Field Confinement Assessment
                </h3>
              </div>
              <span className="px-2.5 py-0.5 bg-[#13161D] text-[#D4A373] border border-[#1C202A] text-[10px] font-bold">
                100% PROVENANCE
              </span>
            </div>

            {/* Dossier Body with Clickable Citations */}
            <div className="flex flex-col gap-4 text-xs sm:text-sm text-[#94A3B8] font-sans leading-relaxed max-w-4xl">
              <p>
                Recent magnet engineering results have fundamentally reshaped tokamak confinement scaling.{" "}
                <span className="text-[#F8FAFC] bg-[#171A22] px-1.5 py-0.5">
                  Commonwealth Fusion Systems achieved sustained 20.1 Tesla central magnetic flux density using rare-earth barium copper oxide (REBCO) conductors
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveProof(CITATION_PROOFS[0]);
                    setDrawerOpen(true);
                  }}
                  className="inline-flex items-center ml-1.5 px-2 py-0.5 bg-[#D4A373] text-[#090A0D] font-mono font-bold hover:bg-[#FFFFFF] transition-colors"
                >
                  [1]
                </button>
                , confirming that compact high-field machines achieve volumetric power densities exceeding traditional ITER configurations.
              </p>

              <p>
                Empirical models calibrated against the SPARC baseline confirm that{" "}
                <span className="text-[#F8FAFC] bg-[#171A22] px-1.5 py-0.5">
                  confinement scaling predicts scientific energy breakeven (Q = 9.1) yielding 140 MW net thermal fusion power
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveProof(CITATION_PROOFS[1]);
                    setDrawerOpen(true);
                  }}
                  className="inline-flex items-center ml-1.5 px-2 py-0.5 bg-[#D4A373] text-[#090A0D] font-mono font-bold hover:bg-[#FFFFFF] transition-colors"
                >
                  [2]
                </button>
                . However, material engineering constraints remain active, specifically where{" "}
                <span className="text-[#F8FAFC] bg-[#171A22] px-1.5 py-0.5">
                  neutron wall loading on the tungsten divertor requires replacement cycles under 2.8 full-power years
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveProof(CITATION_PROOFS[2]);
                    setDrawerOpen(true);
                  }}
                  className="inline-flex items-center ml-1.5 px-2 py-0.5 bg-[#D4A373] text-[#090A0D] font-mono font-bold hover:bg-[#FFFFFF] transition-colors"
                >
                  [3]
                </button>
                .
              </p>
            </div>

            {/* SLIDE-OUT EVIDENCE DRAWER */}
            <div
              className={`absolute inset-y-0 right-0 w-full sm:w-[420px] bg-[#0E1015] border-l border-[#D4A373] p-6 shadow-2xl transition-transform duration-300 ease-out flex flex-col justify-between font-mono text-xs z-30 ${
                drawerOpen ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-[#1C202A]">
                  <span className="flex items-center gap-1.5 text-xs text-[#D4A373] font-bold">
                    <ShieldCheck className="w-4 h-4 text-[#D4A373]" />
                    PROOF DRAWER // AUDIT
                  </span>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="text-[10px] text-[#64748B] hover:text-[#F8FAFC]"
                  >
                    [ESC / CLOSE]
                  </button>
                </div>

                <div>
                  <span className="text-[9px] text-[#64748B]">ATOMIC CLAIM ASSERTION</span>
                  <p className="text-xs text-[#F8FAFC] font-sans font-medium leading-relaxed bg-[#090A0D] p-2.5 border border-[#1C202A] mt-1">
                    {activeProof.claim}
                  </p>
                </div>

                <div>
                  <span className="text-[9px] text-[#D4A373] font-bold">
                    GROUND-TRUTH SOURCE PASSAGE
                  </span>
                  <div className="text-xs text-[#CBD5E1] font-sans bg-[#13161D] border border-[#1C202A] p-3 leading-relaxed italic mt-1">
                    &ldquo;{activeProof.passage}&rdquo;
                  </div>
                  <span className="text-[10px] text-[#64748B] mt-1 block">
                    {activeProof.locator}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 pt-2 border-t border-[#1C202A] text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Source Document:</span>
                    <span className="text-[#94A3B8] truncate max-w-[200px]">{activeProof.source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Auditing Agent:</span>
                    <span className="text-[#D4A373] font-bold">{activeProof.agent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Entailment Confidence:</span>
                    <span className="text-[#F8FAFC] font-bold">{activeProof.entailment}% VERIFIED</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">SHA-256 Digest:</span>
                    <span className="text-[#D4A373] truncate max-w-[170px]">{activeProof.hash}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#1C202A] flex items-center justify-between text-xs font-mono">
                <span className="text-[#64748B] text-[10px]">{activeProof.timestamp}</span>
                <span className="text-[#D4A373] font-bold flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  GROUND-TRUTH BOUND
                </span>
              </div>
            </div>

          </div>

          {/* LOWER: The 5-Agent Architecture Strip */}
          <div id="pipeline" className="p-4 bg-[#0E1015] border border-[#1C202A] font-mono">
            <div className="text-[10px] text-[#64748B] mb-2.5 uppercase tracking-wider flex items-center justify-between">
              <span>SPECIALIZED AGENT SWARM PIPELINE</span>
              <span className="text-[#D4A373]">SPRING AI MODULAR MONOLITH</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
              {AGENT_SWARM.map((agent, i) => (
                <div
                  key={agent.id}
                  className="p-3 bg-[#090A0D] border border-[#1C202A] flex flex-col justify-between"
                >
                  <div>
                    <div className="text-[10px] text-[#D4A373] font-bold">
                      0{i + 1} // {agent.id}
                    </div>
                    <div className="text-xs text-[#F8FAFC] font-bold mt-0.5">{agent.name}</div>
                    <div className="text-[10px] text-[#94A3B8] font-sans mt-1">
                      {agent.role}
                    </div>
                  </div>
                  <div className="mt-3 pt-1.5 border-t border-[#1C202A] text-[9px] text-[#64748B]">
                    {agent.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Minimalist Viewport 2 Footer */}
          <footer className="pt-2 border-t border-[#1C202A] flex flex-col sm:flex-row items-center justify-between font-mono text-[10px] text-[#64748B]">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4A373]" />
              <span className="text-[#F8FAFC] font-bold">NYMBUS</span>
              <span>·</span>
              <span>AUTONOMOUS MULTI-AGENT PROVENANCE PLATFORM</span>
            </div>
            <div className="flex items-center gap-4 text-[#94A3B8] mt-2 sm:mt-0">
              <a href="#ledger" className="hover:text-white">Top</a>
              <Link href="/login" className="text-[#D4A373] hover:underline font-bold">
                Console &rarr;
              </Link>
            </div>
          </footer>

        </div>
      </section>

    </div>
  );
}
