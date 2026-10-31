# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- Primary: Hackathon judges and demo audiences evaluating multi-agent orchestration, architectural depth, and verification integrity.
- Secondary: Intelligence analysts, researchers, and knowledge workers conducting complex multi-source inquiries requiring verifiable proof.

## Product Purpose
Nymbus is a multi-agent research platform designed to transform complex research questions into structured, verified reports. It breaks questions into a dependency graph of subtasks, executes specialized agents (Orchestrator, Research, Verification, Analysis, Report) across web sources and documents, extracts atomic claims, verifies each claim against its source passage, and produces auditable synthesis where every conclusion links directly back to its verified evidence. Success means complete end-to-end traceability and trust.

## Positioning
Unlike conventional AI research or chat tools that output hallucination-prone summaries with superficial URL links, Nymbus proves its conclusions: it visualizes the execution graph, shows actual tool calls, extracts exact source passages, runs an explicit verification agent against those passages, and attributes every section to verifiable proof.

## Operating Context
- Live asynchronous agent orchestration with streaming status and server-sent events (SSE).
- Progressive disclosure and detail on demand: high-level executive report views with inspectable sliding drawers showing underlying subtasks, raw tool execution, claim verification cards, and passage quotes.
- Dual-environment setup: Next.js (App Router, React 19, Tailwind CSS v4) frontend communicating with a Spring Boot modular monolith backend (Spring AI, PostgreSQL + pgvector, OpenRouter LLM gateway).

## Capabilities and Constraints
- Automated task decomposition into directed acyclic dependency graphs (DAG) with cycle detection.
- Parallel bounded execution of research agents querying search tools (e.g., Tavily) and web extractors (e.g., Firecrawl).
- Source passage verification requiring exact passage locators (URLs alone do not qualify as evidence).
- Synthesis and reporting linking report sections directly to verified claims.
- Constraint: No multi-user workspaces, notifications, or conversational chat in v1; strictly focused on deep, auditable task runs.
- Constraint: Never persist chain-of-thought in UI; show concise agent decisions, tool I/O, atomic claims, and verified source snippets.

## Brand Commitments
- Name: Nymbus.
- Personality & Voice: Auditable, calm, precise, confident. Trustworthy rather than flashy.
- Aesthetics & Feel: Live (agents actively working with clear feedback), inspectable (everything clickable down to the source passage), information-rich but scannable.
- Visual anti-references: Generic purple-gradient SaaS dashboards, omnipresent glassmorphism, conversational chat-bubble UIs, decorative AI sparkle iconography, excessive card-in-card nesting, bouncy or elastic physics.

## Evidence on Hand
- PRD.md: Comprehensive product specifications, run workflows, backend modular architecture, agent roles, and SQL migration schemas.
- nymbus-frontend-phases (2).md: Step-by-step frontend execution plan, component architecture, phase gates, and asset generation protocol.
- Existing frontend codebase: `nymbus-fe` scaffolded with Next.js 16 (App Router), React 19, Tailwind CSS v4, and TypeScript.

## Product Principles
1. Show the Work: Every claim, conclusion, and synthesis must trace back to an inspectable source passage and verified agent action.
2. Calm Precision over Flash: Prioritize clarity, high information density, and clean typographic hierarchy over decorative AI tropes or distracting animations.
3. Detail on Demand: Keep the main narrative scannable; provide deep inspection (subtask graphs, tool payloads, source passages) via fluid sliding drawers.
4. Resilient & Honest Feedback: Visually communicate agent states, retry attempts, and verification confidence accurately without masking uncertainties or failures.

## Accessibility & Inclusion
- Strict adherence to WCAG AA color contrast ratios across dark and light modes.
- Full keyboard operability for inspection drawers, citation links, and graph nodes.
- Respect `prefers-reduced-motion` for all live updates and transitions.
