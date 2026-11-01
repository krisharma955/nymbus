"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, X, ArrowRight, ShieldCheck, Terminal, Layers, FileText, Activity } from "lucide-react";

interface TopNavigationProps {
  onSearchOpen?: () => void;
  onInquestSelect?: (query: string) => void;
}

export function TopNavigation({ onSearchOpen, onInquestSelect }: TopNavigationProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleOpenSearch = () => {
    if (onSearchOpen) {
      onSearchOpen();
    } else {
      setSearchModalOpen(true);
    }
  };

  // Close modals on Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setSearchModalOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {/* 
        Top Architectural Masthead:
        Matches the reference screenshot to the last detail.
        Generous padding, clean floating layout, pure minimalist luxury.
      */}
      <header className="fixed top-0 left-0 right-0 z-40 px-6 sm:px-12 py-6 sm:py-8 flex items-center justify-between pointer-events-none">
        
        {/* Left: Minimal Search Icon */}
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={handleOpenSearch}
            aria-label="Search Inquests and Proofs"
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-200 active:scale-95 group"
          >
            <Search className="w-4 h-4 stroke-[1.6] group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Center: The Iconic Three Slanted Slashes Mark /// */}
        <div className="pointer-events-auto">
          <Link
            href="/"
            aria-label="Nymbus Home"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded group transition-transform active:scale-95"
          >
            {/* The 3 angled slashes mark */}
            <div className="flex items-center gap-[4.5px]">
              <span className="w-[3px] h-4 bg-white/90 rounded-full transform -rotate-25 shadow-[0_0_8px_rgba(255,255,255,0.4)] group-hover:bg-white transition-all" />
              <span className="w-[3px] h-4 bg-white/70 rounded-full transform -rotate-25 shadow-[0_0_6px_rgba(255,255,255,0.3)] group-hover:bg-white transition-all delay-75" />
              <span className="w-[3px] h-4 bg-white/50 rounded-full transform -rotate-25 shadow-[0_0_4px_rgba(255,255,255,0.2)] group-hover:bg-white transition-all delay-150" />
            </div>
          </Link>
        </div>

        {/* Right: Minimal Hamburger Menu Icon */}
        <div className="pointer-events-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open Navigation Menu"
            className="w-10 h-10 rounded-full flex flex-col items-center justify-center gap-1.5 text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-200 active:scale-95 group"
          >
            <span className="w-5 h-[1.5px] bg-white/80 group-hover:bg-white transition-colors" />
            <span className="w-5 h-[1.5px] bg-white/80 group-hover:bg-white transition-colors" />
            <span className="w-5 h-[1.5px] bg-white/80 group-hover:bg-white transition-colors" />
          </button>
        </div>
      </header>

      {/* Slide-Out Navigation Drawer */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* Backdrop Scrim */}
        <div
          onClick={() => setMenuOpen(false)}
          className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        />

        {/* Sliding Panel */}
        <div
          className={`absolute top-0 right-0 bottom-0 w-full max-w-md bg-[#08090C] border-l border-white/10 p-8 flex flex-col justify-between transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div>
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-6 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="w-1 h-3.5 bg-white rounded-full transform -rotate-25" />
                  <span className="w-1 h-3.5 bg-white/70 rounded-full transform -rotate-25" />
                  <span className="w-1 h-3.5 bg-white/40 rounded-full transform -rotate-25" />
                </div>
                <span className="font-mono text-xs tracking-widest text-white/90 uppercase font-semibold">
                  NYMBUS · NAVIGATION
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Menu Links */}
            <nav className="mt-8 flex flex-col gap-5 font-mono text-sm">
              <a
                href="#hero"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between py-2 text-white/80 hover:text-white transition-colors group"
              >
                <span className="tracking-widest uppercase">01 // The Eternal Arc</span>
                <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </a>
              <a
                href="#inquest-console"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between py-2 text-white/80 hover:text-white transition-colors group"
              >
                <span className="tracking-widest uppercase">02 // Inquest Decomposer</span>
                <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </a>
              <a
                href="#swarm-matrix"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between py-2 text-white/80 hover:text-white transition-colors group"
              >
                <span className="tracking-widest uppercase">03 // Agent Swarm Matrix</span>
                <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </a>
              <a
                href="#proof-dossier"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between py-2 text-white/80 hover:text-white transition-colors group"
              >
                <span className="tracking-widest uppercase">04 // Verification Dossier</span>
                <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </a>
              <a
                href="#specifications"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between py-2 text-white/80 hover:text-white transition-colors group"
              >
                <span className="tracking-widest uppercase">05 // Specifications</span>
                <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </a>
            </nav>

            {/* Quick Actions */}
            <div className="mt-10 pt-6 border-t border-white/10 flex flex-col gap-3">
              <Link
                href="/chat"
                onClick={() => setMenuOpen(false)}
                className="w-full py-3 bg-white text-black font-mono text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
              >
                <span>Launch Inquest Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/app"
                onClick={() => setMenuOpen(false)}
                className="w-full py-3 border border-white/20 text-white/90 hover:text-white hover:border-white font-mono text-xs tracking-widest uppercase flex items-center justify-center gap-2 transition-colors"
              >
                <span>Forensic Inspector</span>
              </Link>
            </div>
          </div>

          {/* Drawer Footer Telemetry */}
          <div className="pt-6 border-t border-white/10 font-mono text-[11px] text-white/50 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span>SYSTEM PROTOCOL</span>
              <span className="text-[#D4A373]">ACTIVE · 5 AGENTS</span>
            </div>
            <div className="flex items-center justify-between">
              <span>PROVENANCE HASH</span>
              <span className="text-white/70">SHA-256 ENFORCED</span>
            </div>
            <div className="text-[10px] text-white/30 pt-2">
              NYMBUS v1.4.0 · AUTONOMOUS RESEARCH PLATFORM
            </div>
          </div>
        </div>
      </div>

      {/* Forensic Search / Command Palette Modal */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl bg-[#0B0E14] border border-white/20 shadow-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <Search className="w-4 h-4 text-white/50" />
              <input
                type="text"
                autoFocus
                placeholder="Search research claims, source citations, or enter inquiry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm font-mono text-white placeholder-white/30 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setSearchModalOpen(false)}
                className="text-white/40 hover:text-white text-xs font-mono uppercase px-2 py-1"
              >
                ESC
              </button>
            </div>

            {/* Quick Suggestions */}
            <div className="font-mono text-xs flex flex-col gap-1.5 pt-1">
              <div className="text-white/40 text-[10px] uppercase tracking-wider pb-1">
                Verified Research Claims
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onInquestSelect) onInquestSelect("Commonwealth Fusion Systems 20.1 Tesla REBCO magnets");
                  setSearchModalOpen(false);
                }}
                className="text-left px-2.5 py-2 hover:bg-white/[0.06] text-white/80 hover:text-white transition-colors flex items-center justify-between"
              >
                <span>REF-501: 20.1 Tesla REBCO Superconducting Magnet Flux</span>
                <span className="text-[#D4A373] text-[10px]">99.4% Entailment</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onInquestSelect) onInquestSelect("SPARC tokamak energy breakeven scaling Q=9.1");
                  setSearchModalOpen(false);
                }}
                className="text-left px-2.5 py-2 hover:bg-white/[0.06] text-white/80 hover:text-white transition-colors flex items-center justify-between"
              >
                <span>REF-502: SPARC Tokamak Energy Breakeven (Q=9.1, 140MW)</span>
                <span className="text-[#D4A373] text-[10px]">98.8% Entailment</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onInquestSelect) onInquestSelect("Tungsten divertor displacement-per-atom threshold");
                  setSearchModalOpen(false);
                }}
                className="text-left px-2.5 py-2 hover:bg-white/[0.06] text-white/80 hover:text-white transition-colors flex items-center justify-between"
              >
                <span>REF-503: Divertor Ductile-to-Brittle Transition (2.8 FPY)</span>
                <span className="text-[#D4A373] text-[10px]">97.6% Entailment</span>
              </button>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/40">
              <span>Press ENTER to launch inquest in workspace</span>
              <span>ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

