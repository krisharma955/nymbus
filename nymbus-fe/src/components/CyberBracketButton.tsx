"use client";

import React from "react";

interface CyberBracketButtonProps {
  label: string;
  onClick?: () => void;
  href?: string;
  className?: string;
}

export function CyberBracketButton({
  label,
  onClick,
  href,
  className = "",
}: CyberBracketButtonProps) {
  const content = (
    <div className={`relative inline-flex items-center group cursor-pointer select-none ${className}`}>
      {/* Outer subtle hover glow */}
      <div className="absolute inset-0 bg-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* 
        Custom Architectural HUD Frame:
        - Top border extending horizontally, bending down at right
        - Bottom border extending horizontally, bending up at left
        - Corner tick accents
      */}
      <div className="relative px-7 py-3 border border-white/20 group-hover:border-white/50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-active:scale-[0.98]">
        {/* Top-Right Corner Extension Bracket */}
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 pointer-events-none">
          <div className="absolute top-0 right-0 w-3 h-[1px] bg-white/70 group-hover:bg-white transition-colors" />
          <div className="absolute top-0 right-0 h-3 w-[1px] bg-white/70 group-hover:bg-white transition-colors" />
        </div>

        {/* Bottom-Left Corner Extension Bracket */}
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 pointer-events-none">
          <div className="absolute bottom-0 left-0 w-3 h-[1px] bg-white/70 group-hover:bg-white transition-colors" />
          <div className="absolute bottom-0 left-0 h-3 w-[1px] bg-white/70 group-hover:bg-white transition-colors" />
        </div>

        {/* Small Corner Cutout Notches */}
        <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-white/40" />
        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-white/40" />

        {/* Button Label */}
        <span className="font-mono text-xs sm:text-[13px] tracking-[0.22em] uppercase text-white/90 group-hover:text-white transition-colors font-medium">
          {label}
        </span>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} onClick={onClick}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className="bg-transparent border-0 p-0 text-left">
      {content}
    </button>
  );
}

