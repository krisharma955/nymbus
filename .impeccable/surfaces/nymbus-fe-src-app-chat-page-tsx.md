---
version: 1
slug: "nymbus-fe-src-app-chat-page-tsx"
primary_target: "nymbus-fe/src/app/chat/page.tsx"
related_targets: []
---

# Surface Brief: Inquest Chat & Research Workspace

- **Scope & Mode**: Interactive multi-agent research console (`/chat`), Operate mode.
- **Audience & Job**: Researchers, analysts, and hackathon evaluators issuing complex scientific/empirical inquiries; job is to monitor 5 autonomous agents deconstruct the inquiry, inspect intermediate subtask execution, trace live tool calls, and review verifiable conclusions with clickable source passage locators.
- **Visual World**: The Spatial Ledger (Matte Obsidian `#090A0D`, Chalk Bone White `#F8FAFC`, Warm Champagne Gold `#D4A373`, 1px Drafting hairlines `#1C202A`).
- **Core Layout Structure**:
  - **Left Panel (History Ledger)**: Chronological inquest history, verification status tags (`PASSED`, `IN-FLIGHT`, `FLAGGED`), search/filter, and New Inquest trigger.
  - **Middle Workspace (Active Dialogue & Task Progress)**:
    - Active inquiry header with task status bead and agent swarm telemetry.
    - Synchronized Task Progress Deck: real-time visual progress through the 5-agent pipeline (`Orchestrator`, `Research`, `Verification`, `Analysis`, `Report`) with active subtasks.
    - Structured Conversation Stream: not cartoon chat bubbles, but auditable intelligence ledger blocks displaying researcher prompts, intermediate reasoning, tool actions, and synthesized findings with exact paragraph citation locators `[§ 14.2]`.
    - Integrated Inquest Dock: prompt input with scientific inquiry presets, decomposition switch, and model parameters.
- **Anti-References**: Generic rounded chat bubbles, purple gradients, bouncing typing indicators, cluttered dashboard widgets.
