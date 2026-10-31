---
name: Nymbus Design System
description: Spatial Ledger design language for verifiable multi-agent intelligence
colors:
  background: "#090A0D"
  foreground: "#F8FAFC"
  surface: "#0E1015"
  surface-card: "#13161D"
  border: "#1C202A"
  accent-gold: "#D4A373"
  accent-gold-glow: "rgba(212, 163, 115, 0.2)"
  text-muted: "#94A3B8"
  text-dim: "#64748B"
typography:
  display:
    fontFamily: "var(--font-geist-sans), system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2.75rem, 6vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  body:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  mono:
    fontFamily: "var(--font-geist-mono), monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.02em"
rounded:
  sm: "0px"
  md: "2px"
  lg: "4px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    rounded: "{rounded.sm}"
    padding: "10px 24px"
---

# Design System: The Spatial Ledger

## Overview
Nymbus uses an architectural spatial ledger design language. Inspired by Dieter Rams, Linear, and high-precision CAD drafting, the platform rejects decorative clichés and purple glow in favor of monumental typographic authority, mathematical source passage locators, and an interactive 3D isometric drafting grid plane.

## Colors
- **Ground / Matte Obsidian (`#090A0D`)**: Deep matte foundation providing complete focus.
- **Text / Chalk Bone White (`#F8FAFC`)**: High-contrast, pristine readability for headlines and primary actions.
- **Warm Champagne Gold (`#D4A373`)**: Restrained architectural accent for verified citation markers `[1]`, `[2]`, status beads, and 3D card boundaries.
- **Drafting Borders (`#1C202A` / `#141720`)**: Surgical 1px hairlines.

## Typography
- **Monumental Display Sans**: Severe negative tracking (`-0.04em`), uppercase monumental weight, 0.98 line height.
- **Drafting Monospace**: Reserved strictly for verifiable paragraph locators (§ 14.2, REF: 501), SHA-256 digests, and execution timestamps.

## Layout & Spatial Budget
- **Strict 2-Viewport Spatial Budget**:
  - **Viewport 1 (Hero & Isometric Plane)**: Clean masthead with amber status bead, monumental headline, interactive 3D Isometric Ledger, and architectural inquiry console.
  - **Viewport 2 (The Proof Dossier & Pipeline)**: Synthesized research dossier with clickable citations, slide-out Evidence Drawer, 5-Agent pipeline architecture, and minimal footer.
- **Drafting Caliper Grid**: 36px architectural grid for spatial harmony.

## Elevation & Depth
- **Three.js 3D Isometric Drafting Plane**: Tilted architectural plane with elevated rectangular subtask and verification nodes in 3D perspective, responding dynamically to mouse parallax and cursor raycasting.
- **Surgical 1px Hairlines**: Precision separation without fake blurry drop shadows.

## Components
- **Inquest Console**: High-density query input with fast scientific inquiry presets and instant subtask decomposition trigger.
- **Elevated 3D Cards**: Three.js isometric blocks representing active subtasks and verified source passages.
- **Evidence Drawer**: Slide-out verification panel revealing exact highlighted paragraph quotes and SHA-256 provenance hashes.

## Decisions
| Phase | Decision | Chosen | Rejected | Date |
| --- | --- | --- | --- | --- |
| F0 | Visual Direction | The Spatial Ledger (Option 1) | Space/Planets, Vibe-Coded Purple/Fuchsia Crystals, Cluttered Gauges | 31 Oct 2026 |
| F0 | Background Technology | Three.js 3D Isometric Drafting Grid Plane | Prismatic Particle Clouds, Undulating Waves, 3D Planets | 31 Oct 2026 |
| F0 | Spatial Budget | Strict 2-Viewport Architectural Layout | Infinite Scrolling Templates, Single-Viewport Squeeze | 31 Oct 2026 |
| F0 | Workspace Architecture | Option 3: The Integrated Forensic Stream | Option 1: Dual-Track Terminal, Option 2: Modular Canvas Ledger | 31 Oct 2026 |
