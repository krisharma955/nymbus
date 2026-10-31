# Nymbus: frontend implementation phases (Next.js + Impeccable + Higgsfield)

Version 2.0 | 31 October 2026 | Companion to `Nymbus: project context, flow and build plan` v1.1

Use this file as the single reference for building the Nymbus frontend in **Next.js (App Router)** with **Impeccable** driving design quality and **Higgsfield MCP** generating visual assets. Frontend phases F0 to F5 map one to one onto backend phases 0 to 5. Each phase lists the exact pages built, the **live design choices** to make, the Impeccable command sequence, the Higgsfield assets to generate, and what gets locked into the design system before moving on.

Changes from v1.1: phases reorganised around a design-and-build loop. Added the tool roles, the live choice protocol, a page-to-phase sync matrix, per-phase design choices, Impeccable command sequences and Higgsfield asset lists.

> **Verify before relying on exact names.** Impeccable's command list has changed between versions (for example `teach` became `init`, and the count has grown from 18 to 23). Run `/impeccable` in your install and use the names it shows. Command names below follow the current public repository.

---

# 1. How the tools fit together

| Tool | Role in this project | Used for | Not used for |
| --- | --- | --- | --- |
| **Impeccable** (skill + CLI, by Paul Bakaus) | Design brain. Shapes each page, builds it with visual iteration, reviews it, and keeps it consistent | `init`, `shape`, `craft`, live variant iteration, `critique`, `audit`, `polish`, `extract`, `document`, `animate`, `adapt`, `onboard`, plus the `detect` CLI as a deterministic anti-pattern gate | Backend logic, data wiring |
| **Higgsfield MCP** (hosted at `https://mcp.higgsfield.ai/mcp`, OAuth sign-in, no API key) | Asset generator: images and short video clips | Login and landing visuals, empty-state illustrations, agent avatars, report cover art, ambient loops, demo teaser, OG image | UI screens, charts, anything containing readable text, logos with text, real people, copyrighted characters |
| **Next.js + TanStack Query + MSW** | The app and its data layer | Pages, routing, API wiring, mock data | Design decisions |

**Cost warning:** every Higgsfield generation deducts credits regardless of plan, and video clips are silent and capped at roughly 15 seconds. Set an asset budget in F0 and generate in batches (see "Asset rules").

**Principle:** Impeccable decides how a page should look and behave. Higgsfield only supplies pictures and motion for slots Impeccable has already reserved in the design. Never let an asset dictate the layout.

---

# 2. Live choice protocol

"Live choices" means design decisions are made interactively, at the moment each page is built, rather than guessed upfront.

1. **Start each page with `shape`.** Impeccable produces a short UX plan. Pick the decisions listed under "Live choices" for that phase.
2. **Offer at most 3 options per decision.** Use Impeccable's live browser iteration (variants rendered in the running app) or ask for options in the harness with previews. Choose in the browser, not from descriptions.
3. **Time-box.** About 10 minutes per decision. If undecided, take the first recommended option and move on. Hackathon time is the scarcest resource.
4. **Record every decision** in `DESIGN.md` under a "Decisions" section: what was chosen, the rejected options in one line each, and the date. This is what keeps later phases in sync.
5. **Lock before moving on.** At the end of each phase run `extract` and `document` so chosen patterns become tokens and shared components, and later pages inherit them instead of reinventing them.
6. **Do not reopen locked decisions** in later phases unless `critique` finds a real usability problem.

### Decision log template (in `DESIGN.md`)

```
## Decisions
| Phase | Decision | Chosen | Rejected | Date |
| F0 | Visual direction | B: Editorial research | A: Ops console, C: Playful | 31 Oct |
```

---

# 3. Tool setup (do once, at the start of F0)

### 3.1 Impeccable

- [ ] Install for your harness (`npx impeccable install --providers=claude` or the plugin route) and reload the harness
- [ ] Run `/impeccable init` (called `teach` in older versions). Answer using the seed below. It writes `PRODUCT.md` and `DESIGN.md`
- [ ] Confirm `npx impeccable detect` runs, so it can be used as a gate in each phase

**`PRODUCT.md` seed for Nymbus** (paste or adapt during `init`):

```
Product: Nymbus, a multi-agent research platform. A user asks a complex question;
agents plan, research, verify and report, and every conclusion traces to its evidence.
Core promise: show the work. Decomposition, tool calls, evidence, verification, citations.
Users: hackathon judges and demo audiences first; analysts and researchers second.
Personality: auditable, calm, precise, confident. Trustworthy rather than flashy.
Density: information-rich but scannable. Detail on demand through drawers, not walls of text.
Must feel: live (agents working), inspectable (everything clickable down to the source passage).
Anti-references: generic purple-gradient SaaS dashboards, glassmorphism everywhere,
chat-bubble UIs (this is not a chatbot), decorative AI sparkle iconography,
card-in-card nesting, bounce or elastic motion.
Accessibility: WCAG AA contrast, keyboard-operable drawers, reduced-motion respected.
```

### 3.2 Higgsfield MCP

- [ ] Add the hosted server `https://mcp.higgsfield.ai/mcp` to your harness (for Claude Code, add it as an HTTP MCP server and complete the OAuth sign-in)
- [ ] Top up credits and agree an **asset budget** (for example: about 25 images and 3 short clips for the whole project)
- [ ] Create `public/assets/` and `public/assets/MANIFEST.md`
- [ ] Do a single test generation to confirm the connection before the design session

### Asset rules

- **Reserve slots first.** Generate only for slots that exist in an Impeccable-approved layout, with the target dimensions and aspect ratio known.
- **Style lock.** After the first accepted image, write a one-paragraph style prompt (palette words, lighting, abstraction level, "no text, no logos, no people") and reuse it as the prefix for every later generation so assets look like one set.
- **No text in images.** Generated lettering is unreliable. Put all text in HTML.
- **No real people, no copyrighted characters or brands.**
- **Record every asset** in `MANIFEST.md`: file, slot, model, prompt, date, credits used.
- **Optimise.** Convert to WebP or AVIF, compress video to MP4 or WebM with a poster frame, target under 300 KB per image and under 2 MB per loop.
- **UI must work without assets.** Every slot has a CSS or SVG fallback so a missing or slow asset never breaks a page or the demo.
- **Respect `prefers-reduced-motion`.** Loops pause or show the poster frame.
- **Generate in batches** during the design step of a phase, not page by page, to save credits.

---

# 4. Page-to-phase sync matrix

This is the master list. Every page or major surface appears in exactly one build phase, with its follow-up upgrades noted.

| # | Page or surface | Route | Built in | Upgraded in | Backend phase it needs | Higgsfield asset |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Login | `/login` | F0 | F5 (polish) | 0 | Hero visual, optional ambient loop |
| 2 | App shell (top bar, user menu) | all `(app)` routes | F0 | | 0 | Wordmark mark (SVG, hand-made, not generated) |
| 3 | Task list | `/tasks` | F0 | F5 (example run) | 0 | Empty-state illustration |
| 4 | New task form | `/tasks/new` | F0 | | 0 | None |
| 5 | Task layout (header, tabs, status stepper shell) | `/tasks/[taskId]/*` | F0 | F2 (connection indicator), F5 (usage) | 0 | None |
| 6 | Error, 404, loading states | global | F0 | F5 (audit) | 0 | Optional 404 illustration |
| 7 | Overview tab | `.../overview` | F1 | F5 (usage panel) | 1 | None |
| 8 | Plan tab (subtask list, dependency graph, subtask drawer) | `.../plan` | F1 | | 1 | Five agent avatars |
| 9 | Activity tab: execution list | `.../activity` | F1 | F2 (timeline) | 1 | None |
| 10 | Report tab (basic markdown with inert markers) | `.../report` | F1 | F4 (sections, citations) | 1 | Report cover art |
| 11 | Activity tab: live timeline, tool calls, agent messages | `.../activity` | F2 | | 2 | None |
| 12 | Evidence explorer | `.../evidence` | F2 | F4 (cited-in filter) | 2 | None |
| 13 | Evidence detail drawer (claim, passage, support types, verification history) | drawer | F2 | F3 (page citations), F4 (cited in) | 2 | None |
| 14 | Sources tab and source drawer | `.../sources` | F2 | F3 (documents), F4 | 2 | None |
| 15 | Documents tab (upload, processing status) | `.../documents` | F3 | | 3 | Upload empty-state illustration |
| 16 | Sectioned report with clickable citations, outline, versions, export | `.../report` | F4 | | 4 | Reuse report cover |
| 17 | Standalone report page (print-friendly) | `/reports/[reportId]` | F4 | | 4 | Reuse report cover |
| 18 | Cancel flow, usage and cost panel, session-expired dialog | task header, overview | F5 | | 5 | None |
| 19 | Demo mode and example run | global | F5 | | 5 | None |
| 20 | Landing page (optional) | `/` when signed out | F5 | | none | Hero loop, OG image, teaser clip |

If time runs out, drop items in this order: 20, then 19's replay polish, then F3 (rows 15), then F4's export. Rows 1 to 14 and the inline-citation fallback are the minimum demo.

---

# 5. The per-page loop

Run this loop for every page in the matrix. It is the same loop in every phase, which is what keeps everything in sync.

```
1. shape      Plan the page (purpose, hierarchy, states, key actions). Read PRODUCT.md and DESIGN.md first
2. choose     Make the phase's live choices for this page (max 3 options, time-boxed)
3. mock       Add or extend MSW fixtures for the endpoints this page needs
4. craft      Build the page with visual iteration against the mock data
5. assets     Generate any reserved Higgsfield slots, drop them in, check the fallback
6. wire       Switch the page from MSW to the real endpoint when the backend phase is ready
7. critique   Review hierarchy, clarity and emotional resonance. Fix the top issues only
8. audit      Run audit (accessibility, performance, responsive) and `npx impeccable detect`
9. polish     Final pass: spacing, alignment, states, microcopy
10. lock      extract shared components and tokens, document into DESIGN.md, log decisions
```

**Per-page gate (all must be true before moving on):**

- [ ] Loading, empty, error and populated states all exist
- [ ] Works with MSW fixtures and with the real backend
- [ ] `audit` has no critical findings and `detect` reports no new anti-patterns
- [ ] Keyboard path works, including drawers and dialogs
- [ ] Decisions are logged in `DESIGN.md`
- [ ] Any Higgsfield asset is optimised, in `MANIFEST.md`, and has a fallback

**Per-phase gate:** run `critique` across the whole phase's pages together to catch cross-page inconsistency, then `extract` and `document`.

**Useful side commands:** `distill` to strip overloaded screens, `bolder` or `quieter` to correct tone, `animate` for purposeful motion (live status changes, drawer transitions), `adapt` for tablet and mobile widths, `onboard` for first-run empty states, and the `ux-writing` guidance for button labels, errors and empty states.

---

# 6. Technical context (Next.js)

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router) + TypeScript. Pages are thin server components rendering client feature components |
| Server state | TanStack Query in client components |
| UI state | Zustand only if needed (for example the open citation drawer) |
| Styling | Tailwind CSS + shadcn/ui (Radix). Tokens come from Impeccable's `DESIGN.md` and are mirrored in CSS variables and Tailwind theme |
| Forms | React Hook Form + Zod |
| Live updates | `@microsoft/fetch-event-source` in a client hook |
| Graph | React Flow + dagre, loaded with `next/dynamic` and `ssr: false` |
| Markdown | `react-markdown` + `remark-gfm` + `rehype-sanitize` + custom citation plugin |
| Charts | Recharts (client only) |
| Mocking | MSW in browser mode. Doubles as demo mode |
| Tests | Vitest + Testing Library, one Playwright end-to-end path |
| Deployment | Docker with `output: 'standalone'` |

## Scope rules

- One Next.js app. Spring Boot is the only backend. No Server Actions or route handlers for business logic. The single allowed route handler is an optional SSE proxy.
- No conversations, workspaces, notifications or agent memory UI.
- Never render chain-of-thought. Show concise decisions, redacted tool I/O, findings and evidence only.
- Treat source text, passages and report markdown as untrusted. No `dangerouslySetInnerHTML`. Sanitise markdown, open external links with `rel="noopener noreferrer"`.
- DTO types only at the API boundary.
- Generated assets are decoration. They never carry information a user needs.

## Backend connection

The browser talks to Spring Boot **same-origin** so the session cookie works and CORS is not needed.

- **REST and OAuth:** `rewrites()` in `next.config.ts` forward `/api/:path*`, `/oauth2/:path*` and `/login/oauth2/:path*` to `BACKEND_URL`. Alternative: a reverse proxy in docker-compose. Pick one in F0.
- **Build-time caveat:** rewrite destinations are fixed at build time in a standalone build, so pass `BACKEND_URL` as a Docker build argument.
- **OAuth redirect URIs** registered with Google and GitHub must use the public Next.js host. Spring needs `server.forward-headers-strategy=framework`.
- **SSE:** rewrites can buffer or compress streams. Use `compress: false`, or a route-handler proxy at `app/api-stream/[taskId]/route.ts` that forwards the cookie and pipes `text/event-stream` with `Cache-Control: no-cache, no-transform`. Verify in F2.

## Auth

- Backend issues a secure `HttpOnly` session cookie after OAuth. The frontend never sees provider tokens.
- Login buttons are plain anchors to `/oauth2/authorization/google` and `/oauth2/authorization/github`, not `next/link` transitions or fetch calls.
- `middleware.ts` redirects to `/login?next=` when the session cookie is missing. It is a UX guard only. Spring enforces ownership on every call.
- `GET /api/me` validates the session. Any 401 redirects to `/login`.

## Server vs client components

- `layout.tsx` and `page.tsx` stay server components where possible. Anything with hooks, queries, SSE, drawers, forms, graph or charts is `'use client'`.
- Fetch authenticated data client-side through TanStack Query. No server prefetching in v1.
- Browser-only libraries (React Flow, react-pdf) use `next/dynamic` with `ssr: false`.
- A client `Providers` component in the root layout holds QueryClientProvider, toaster and MSW bootstrap.

## Folder structure

```
src/
├── app/
│   ├── layout.tsx  providers.tsx  globals.css  not-found.tsx  error.tsx  global-error.tsx
│   ├── (public)/login/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                 AppShell + useMe guard
│   │   ├── page.tsx                   redirect to /tasks
│   │   ├── tasks/page.tsx  tasks/new/page.tsx
│   │   ├── tasks/[taskId]/
│   │   │   ├── layout.tsx             header, tabs, polling and SSE hook
│   │   │   ├── page.tsx               redirect to overview
│   │   │   └── overview/ plan/ activity/ evidence/ sources/ documents/ report/
│   │   └── reports/[reportId]/page.tsx
│   └── api-stream/[taskId]/route.ts   optional SSE proxy
├── middleware.ts
├── api/                               client.ts, one file per resource, types.ts
├── features/                          auth, tasks, workflow, executions, evidence,
│                                      sources, documents, report, ops (client components)
├── components/                        shared UI (StatusBadge, JsonViewer, shadcn ui/)
├── hooks/  lib/  mocks/
public/
└── assets/                            generated images and loops + MANIFEST.md
PRODUCT.md  DESIGN.md                  Impeccable context, decisions log
```

## Conventions

- All server data goes through TanStack Query hooks in `api/`. No direct `fetch` in components.
- Query key factory per resource, for example `['task', taskId, 'evidence']`.
- One shared `StatusBadge` for every status enum. Colours and icons come from the design tokens, never per page.
- Every list has loading, empty and error states. Use skeletons for lists. Use `loading.tsx` and `error.tsx` per route segment.
- Laptop width first. Mobile is a polish item handled with `adapt`.
- Timestamps in the user's timezone, durations human-readable, cost to 4 decimals.
- Long text (cleaned source text, raw payloads) is truncated and fetched only when expanded.
- Hide tabs whose backend endpoints do not exist yet.
- Environment: `BACKEND_URL` (server and build only), `NEXT_PUBLIC_DEMO_MODE`. No secrets in `NEXT_PUBLIC_*`.
- Remote avatar URLs need `images.remotePatterns` or a plain `<img>`.

---

# 7. Build phases overview

| Phase | Theme | Pages from the matrix | Backend | Done when |
| --- | --- | --- | --- | --- |
| F0 Foundation and design system | Tool setup, visual direction, shell, login, tasks | 1, 2, 3, 4, 5, 6 | Phase 0 | Sign in, create a task, and the app already looks like a product |
| F1 First slice | Execute, plan, executions, basic report | 7, 8, 9, 10 | Phase 1 | A question becomes a visible plan and report |
| F2 Evidence | Live timeline, evidence explorer, sources | 11, 12, 13, 14 | Phase 2 | Each claim and its pass or fail reason is inspectable live |
| F3 Documents | Upload and document citations | 15 | Phase 3 | An uploaded PDF is cited with page numbers |
| F4 Citations | Sectioned report, clickable citations, export | 16, 17 | Phase 4 | Click a citation, see passage and source |
| F5 Polish and demo | Cancel, usage, demo mode, landing, tests, Docker | 18, 19, 20 | Phase 5 | Stable live demo |

**Stop-early rule:** after F2, citations can remain inline `[E:uuid]` chips that open the evidence drawer. That already demonstrates traceability.

**Never blocked by the backend:** every phase starts from MSW fixtures. Switch each endpoint to the real one as it lands.

---

## Phase F0: Foundation and design system

**Goal:** A working signed-in shell with a locked visual direction, so every later page inherits it.

**Pages:** Login (1), App shell (2), Task list (3), New task (4), Task layout shell (5), Error, 404 and loading states (6).

**Backend needed:** `GET /api/me`, `POST /api/research-tasks`, `GET /api/research-tasks`, `GET /api/research-tasks/{taskId}`, OAuth start URLs.

### Step 1: Tool setup

Do section 3 (Impeccable `init`, Higgsfield connection, asset budget).

### Step 2: Live choices (these set the look of the whole product)

| # | Decision | Suggested options to put in front of you | Why it matters |
| --- | --- | --- | --- |
| 1 | Visual direction | A: Ops console (dense, dark, monospace accents). B: Editorial research (light, serif headings, generous reading width). C: Calm lab (neutral light, restrained colour, strong data typography) | Everything inherits this |
| 2 | Light or dark default | Light, dark, system with a toggle later | Affects tokens and generated asset palettes |
| 3 | Type pairing | Two or three pairings chosen by `craft` | Reports are read-heavy, evidence is data-heavy |
| 4 | Status vocabulary | Dot plus label, filled pill, or icon plus label | Used on every page by `StatusBadge` |
| 5 | Agent identity | Colour per agent, icon per agent, or avatar per agent (avatars would come from Higgsfield in F1) | Used in the graph, timeline and messages |
| 6 | Login layout | Split hero, centred card over ambient visual, minimal | First impression for judges |
| 7 | Task list form | Table, cards, or hybrid rows with status stepper | Sets list density across the app |
| 8 | Motion level | Minimal, purposeful (state changes only), expressive | Guides `animate` later |

### Step 3: Impeccable sequence

```
init (done)  ->  shape (login)  ->  craft (login)  ->  shape (shell + task list + new task)
->  craft (those)  ->  shape (error/404/loading)  ->  craft  ->  critique (whole phase)
->  audit + detect  ->  polish  ->  extract (tokens, StatusBadge, EmptyState, shell)  ->  document
```

### Step 4: Higgsfield assets (generate as one batch after choices 1 and 2 are made)

| Slot | Page | Type | Notes |
| --- | --- | --- | --- |
| Login hero | Login | 1 image, wide | Abstract, no text, matches chosen palette. This becomes the style-lock reference |
| Login ambient loop | Login | 1 short loop, optional | Skip if credits are tight. Poster frame fallback |
| Empty task list | Task list | 1 image, square | Abstract "nothing yet" scene, no text |
| 404 illustration | 404 | 1 image, optional | Reuse the style prompt |

### Step 5: Build and wire

- [ ] Scaffold Next.js (App Router, TypeScript, Tailwind, ESLint, `src/`), add shadcn/ui, TanStack Query, React Hook Form, Zod
- [ ] Configure `next.config.ts`: rewrites (or reverse proxy), `output: 'standalone'`, `images.remotePatterns`
- [ ] `.env.example` with `BACKEND_URL` and `NEXT_PUBLIC_DEMO_MODE`
- [ ] `api/client.ts`: JSON wrapper with `credentials: 'include'`, normalised errors, global 401 redirect
- [ ] DTO types and enums: `User`, `ResearchTask`, `TaskStatus`, `ExecutionMode`
- [ ] Root layout and client `Providers`
- [ ] `middleware.ts` cookie-presence redirect (agree the cookie name with the backend owner)
- [ ] `useMe` and the `(app)/layout.tsx` guard
- [ ] Login with Google and GitHub anchors, and an error state for failed callbacks
- [ ] Task list, `NewTaskForm` (title, prompt with count, execution mode, optional budgets under "Advanced"), redirect to `/tasks/[taskId]/overview`
- [ ] `[taskId]/layout.tsx` with `TaskHeader` and `TaskTabs` (tabs appear as phases land)
- [ ] MSW fixtures for all F0 endpoints, started only in demo mode or on request
- [ ] `not-found.tsx`, `error.tsx`, `global-error.tsx`, toasts

### Components

`Providers`, `AppShell`, `UserMenu`, `ProviderButton`, `StatusBadge`, `TaskTable` or `TaskCard`, `NewTaskForm`, `TaskHeader`, `TaskTabs`, `EmptyState`, `ErrorState`, `Skeleton`.

### Lock-in (add to `DESIGN.md` and `MANIFEST.md`)

Palette and type tokens, spacing scale, status vocabulary and colours, agent identity treatment, motion rules, the asset style prompt, and all eight decisions above.

**Done when:** Sign-in works through the Next.js host with both providers, a task can be created and listed, the task detail page opens with the right header, `audit` is clean for these pages, and the design decisions are logged.

---

## Phase F1: First vertical slice

**Goal:** Press Execute, watch the plan form, get a report.

**Pages:** Overview (7), Plan with graph and subtask drawer (8), Activity execution list (9), Report basic (10).

**Backend needed:** `POST .../execute`, `GET .../subtasks`, `GET .../executions`, `GET .../reports`.

Live SSE does not exist until backend phase 2, so F1 polls every 2 to 3 seconds while status is `PLANNING`, `READY` or `RUNNING`. Mount the polling hook in `[taskId]/layout.tsx` so all tabs share it.

### Live choices

| # | Decision | Options | Applies to |
| --- | --- | --- | --- |
| 1 | Overview composition | Stepper-first, report-first, or two-column status plus preview | Overview |
| 2 | Plan layout | Graph-first, list-first, or split view with a toggle | Plan |
| 3 | Graph node design | Compact chip with status dot, card with agent avatar, or minimal label | Plan graph |
| 4 | Execute action | Primary button in header, floating bar, or inline on overview | Task header |
| 5 | Execution row density | Single line, two-line, or expandable detail | Activity |
| 6 | Report reading layout | Narrow editorial column, wide with side rail, or paper-like page | Report |
| 7 | Inline marker style | Superscript numbers, small chips, or underlined phrase | Report (carried into F2 and F4) |

### Impeccable sequence

```
shape (overview) -> craft -> shape (plan + graph) -> craft -> shape (activity list) -> craft
-> shape (report basic) -> craft -> animate (status changes, graph node transitions)
-> critique (phase) -> audit + detect -> polish -> extract -> document
```

### Higgsfield assets (one batch)

| Slot | Page | Type | Notes |
| --- | --- | --- | --- |
| Agent avatars x5 | Plan graph, drawer, later timeline | 5 images, square | Orchestrator, Researcher, Verifier, Analyst, Reporter. Same style prompt, distinct colour or motif, no text. If credits are short, use SVG icons instead |
| Report cover art | Report page header | 1 image, wide | Abstract, reusable in F4 and the standalone report |

### Build and wire

- [ ] `ExecuteButton`: idempotent, disabled once not `PENDING`, handles the "already active" reply as a normal state
- [ ] `useTaskPolling` with terminal-status stop
- [ ] `TaskStatusStepper` including failed and cancelled states with the sanitised `failure_reason`
- [ ] Overview: stepper, prompt, plan summary, subtask counts by status, latest report preview
- [ ] Plan: `SubtaskList`, `SubtaskDetailDrawer`, `DependencyGraph` (dagre layout, dynamic import)
- [ ] Activity: `ExecutionList` with agent, attempt, status, model, tokens, cost, duration, error, expandable output in `JsonViewer`
- [ ] Report: render `content_markdown` sanitised, with `[E:uuid]` markers as `CitationChip` (inert until F2)
- [ ] `ReportStatusBanner` for `GENERATING`, `COMPLETED`, `FAILED`
- [ ] Extend MSW with one full happy-path run and one failed run

### Components

`ExecuteButton`, `TaskStatusStepper`, `SubtaskList`, `SubtaskRow`, `SubtaskDetailDrawer`, `DependencyGraph`, `SubtaskNode`, `AgentBadge`, `ExecutionList`, `ExecutionRow`, `JsonViewer`, `MarkdownView`, `CitationChip`, `ReportStatusBanner`.

### Lock-in

Graph node spec, agent avatar set, execution row pattern, marker style, report typography, drawer pattern (reused in F2, F3, F4).

**Done when:** A submitted question is planned, researched and returned as a report, the graph shows subtasks changing status, and the five agents are visually distinguishable. This is the first demoable slice.

---

## Phase F2: Evidence and verification

**Goal:** Make the research auditable and live.

**Pages:** Live timeline, tool calls and agent messages (11), Evidence explorer (12), Evidence detail drawer (13), Sources tab and drawer (14).

**Backend needed:** `GET .../events`, `GET .../stream`, `GET .../sources`, `GET .../evidence`, `GET /api/evidence/{evidenceId}`.

**First step before any design:** confirm SSE arrives incrementally through the chosen proxy in a production build. Fix `compress: false`, the route-handler proxy or proxy buffering now.

### Live choices

| # | Decision | Options | Applies to |
| --- | --- | --- | --- |
| 1 | Timeline structure | Single vertical rail, lanes per agent, or grouped by execution | Timeline |
| 2 | Live feel | Auto-scroll with pause on user scroll, "new events" pill, or highlight flash | Timeline |
| 3 | Evidence explorer layout | Table plus right drawer, master-detail split, or grouped by verification status | Evidence |
| 4 | Verification funnel | Segmented bar, stacked counts, or mini chart | Evidence summary |
| 5 | Passage highlight style | Highlighted span with locator badge, quote block, or side-by-side with source text | Evidence drawer |
| 6 | Support type treatment | Colour tags, icon tags, or grouped sections | Evidence drawer |
| 7 | Rejected claim treatment | Muted strikethrough with reason, red flag with reason, or collapsed group | Evidence explorer |
| 8 | Source list form | Table, cards with favicon and domain, or compact list | Sources |

### Impeccable sequence

```
shape (timeline) -> craft -> animate (event arrival, restrained)
-> shape (evidence explorer) -> craft -> shape (evidence drawer) -> craft  [the hero component, spend extra time here]
-> shape (sources) -> craft -> critique (phase) -> audit + detect -> polish -> extract -> document
```

Run `critique` on the evidence drawer specifically. It is the component judges will click most.

### Higgsfield assets

None required. Optionally one small empty-state image for "no evidence yet". Spend credits elsewhere.

### Build and wire

- [ ] `useTaskStream(taskId)`: fetch-event-source with credentials, `Last-Event-ID` resume, exponential backoff, cache invalidation per event type, polling fallback with a "Live updates paused" indicator, close on terminal status, pause when tab hidden
- [ ] `ConnectionIndicator` in the task header
- [ ] Timeline from `workflow_events`, grouped per the chosen pattern
- [ ] `ToolCallPanel` (redacted I/O) and `AgentMessagesPanel` (typed hand-offs)
- [ ] `EvidenceTable` with filters in URL search params, `VerificationSummaryBar`, row opens the drawer, `?evidence=<id>` deep link
- [ ] `EvidenceDetailDrawer`: claim, status, `PassageViewer` with locator, sources grouped by SUPPORTS, CONTRADICTS, CONTEXTUALIZES, `VerificationHistory`
- [ ] Sources table and `SourceDetailDrawer` with lazy-loaded cleaned text
- [ ] Wire F1 `CitationChip` to open the evidence drawer (this is the stop-early citation experience)
- [ ] Display rejected claims with the "passage not found in source text" reason when provided

### Components

`useTaskStream`, `ConnectionIndicator`, `Timeline`, `TimelineEvent`, `ToolCallPanel`, `AgentMessagesPanel`, `EvidenceTable`, `EvidenceFilters`, `VerificationSummaryBar`, `EvidenceDetailDrawer`, `PassageViewer`, `VerificationHistory`, `SupportTypeTag`, `SourceTable`, `SourceDetailDrawer`, `SourceTypeBadge`, `ConfidenceMeter`.

### Lock-in

Timeline pattern, evidence drawer anatomy, verification colours and icons, passage highlight style, filter bar pattern.

**Done when:** The UI shows what each agent did live, which claims were found, and why each passed or failed, with the exact passage and verification history one click away.

---

## Phase F3: Documents and RAG

**Goal:** Users attach PDFs and see them cited.

**Pages:** Documents tab (15). Also upgrades the evidence drawer, source drawer and `SourceTypeBadge` for document citations.

**Backend needed:** `POST .../documents`, `GET .../documents`, document-backed sources and evidence.

### Live choices

| # | Decision | Options | Applies to |
| --- | --- | --- | --- |
| 1 | Upload surface | Full-tab dropzone, compact inline uploader above the list, or drawer | Documents |
| 2 | Processing visualisation | Status badge only, step progress (uploaded, processing, ready), or progress bar | Document rows |
| 3 | Page-level citation display | Page badge with excerpt, mini page preview, or text only | Evidence drawer |
| 4 | Pre-execute guidance | Inline notice, step in task creation, or banner | Task header and documents |

### Impeccable sequence

```
shape (documents) -> craft -> onboard (first-run guidance: upload before executing)
-> craft (page-citation upgrade in drawer) -> critique -> audit + detect -> polish -> extract -> document
```

### Higgsfield assets

| Slot | Page | Type | Notes |
| --- | --- | --- | --- |
| Upload empty state | Documents | 1 image, square | Same style prompt, abstract, no text |

### Build and wire

- [ ] `DocumentUploader`: drag and drop plus picker, PDF only, client validation, progress via `XMLHttpRequest`, multiple files, `multipart/form-data` through the proxy (check body size limits)
- [ ] `DocumentList` with `ProcessingStatusBadge` and error text
- [ ] Poll while any document is `UPLOADED` or `PROCESSING`, or react to SSE events if emitted
- [ ] Disable upload on terminal task statuses, show a notice if uploading after execution started
- [ ] `PassageViewer` shows file name and **page number** for `USER_DOCUMENT` sources
- [ ] Sources filter "My documents"
- [ ] Optional: `react-pdf` viewer (dynamic import, `ssr: false`) only if time allows

### Components

`DocumentUploader`, `DocumentList`, `DocumentRow`, `ProcessingStatusBadge`, extended `PassageViewer`.

### Lock-in

Upload pattern, processing status visual, page-citation treatment.

**Done when:** A user uploads a PDF, sees it reach READY, runs the task, and opens a claim showing the PDF name, page number and passage.

---

## Phase F4: Citations and polished output

**Goal:** A report whose important conclusions are clickable down to the source.

**Pages:** Sectioned report with citations (16), standalone report page (17).

**Backend needed:** `GET /api/reports/{reportId}`, `GET /api/reports/{reportId}/export`.

### Live choices

| # | Decision | Options | Applies to |
| --- | --- | --- | --- |
| 1 | Citation interaction | Hover popover then drawer, side panel only, or inline expand | Report |
| 2 | Report navigation | Sticky outline rail, top section tabs, or none | Report |
| 3 | Trust signal | Meta bar with percent verified, per-section badge, or both | Report header and sections |
| 4 | Analysis labelling | Per-block tags (fact, assumption, calculation, estimate), margin notes, or colour-coded text | Report body |
| 5 | Unverified warning | Subtle flag, inline note, or section banner | Sections citing weak evidence |
| 6 | Export placement | Header menu, floating action, or footer | Report |
| 7 | Standalone page tone | Presentation-style, print-style, or same as in-app | `/reports/[reportId]` |

### Impeccable sequence

```
shape (sectioned report) -> craft -> shape (citation popover + drawer link-up) -> craft
-> animate (popover, scroll spy) -> shape (standalone/print) -> craft
-> critique (phase, with focus on the click-a-citation path end to end) -> audit + detect
-> polish -> extract -> document
```

### Higgsfield assets

Reuse the F1 report cover art. Optionally one wide image for the standalone page header. Avoid new generation unless a slot is clearly empty.

### Build and wire

- [ ] `ReportSection` blocks with ordered sections, markdown body, citation footer
- [ ] `CitationChip` using `citation_label`, with `CitationPopover` (claim snippet and status) and `CitationDrawer` reusing `EvidenceDetailDrawer` with a "Cited in" list
- [ ] `ReportOutline` with scroll spy, `ExecutiveSummaryCard`, `ReportVersionSelect` (version in URL search params)
- [ ] `ReportMetaBar`: generated by, model, claims cited, percent VERIFIED
- [ ] `UnverifiedWarning` for sections citing INCONCLUSIVE or REJECTED evidence
- [ ] `AnalysisTag` per the labelling decision
- [ ] `ExportMenu` (Markdown and PDF) via blob download
- [ ] `/reports/[reportId]` with print stylesheet and `generateMetadata`
- [ ] Evidence explorer "Cited in report" filter and back-links, source drawer shows citing sections
- [ ] Fallback for reports without sections: render `content_markdown` with inline markers as in F1

### Components

`ReportSection`, `CitationChip`, `CitationPopover`, `CitationDrawer`, `ReportOutline`, `ExecutiveSummaryCard`, `ReportVersionSelect`, `ReportMetaBar`, `AnalysisTag`, `ExportMenu`.

### Lock-in

Citation interaction spec, report typography and print rules, trust indicators.

**Done when:** A complete report renders and any citation opens the claim, exact passage, source and verification history.

---

## Phase F5: Reliability, polish and demo

**Goal:** A predictable, observable, good-looking demo.

**Pages and surfaces:** Cancel flow, usage and cost panel, session-expired dialog (18), demo mode and example run (19), optional landing page (20).

**Backend needed:** `POST .../cancel`, budget and cost fields on tasks and executions.

### Live choices

| # | Decision | Options | Applies to |
| --- | --- | --- | --- |
| 1 | Usage presentation | Progress bars with warning state, compact meter in header, or chart panel | Overview and header |
| 2 | Cancel confirmation | Dialog, inline confirm, or undo toast | Task header |
| 3 | Demo mode signalling | Visible banner, small badge, or silent | Global |
| 4 | Landing page concept (optional) | Product story scroll, single hero plus live demo embed, or minimal hero plus CTA | `/` signed out |
| 5 | Global motion pass | Keep minimal, add purposeful transitions, or one signature moment | Whole app |

### Impeccable sequence

```
shape (usage + cancel) -> craft -> shape (landing, optional) -> craft
-> adapt (tablet and mobile widths for the demo-critical pages)
-> animate (one signature moment only, for example the plan graph filling in)
-> critique (whole product, end to end) -> audit + detect (whole app) -> polish (whole app)
-> extract -> document (final DESIGN.md)
```

Do a full-product `critique` while walking the demo script, not page by page.

### Higgsfield assets (final batch, only if credits remain)

| Slot | Page | Type | Notes |
| --- | --- | --- | --- |
| Landing hero loop | Landing | 1 short loop | Silent, ambient, poster fallback, pause on reduced motion |
| OG and social image | Metadata | 1 image | No text in the image, title comes from metadata |
| Demo teaser clip (optional) | README, submission | 1 short clip | For the project submission, not the app |

### Build and wire

- [ ] `CancelButton` with confirmation, visible while `PLANNING` or `RUNNING`, clear `CANCELLED` state
- [ ] `UsagePanel` and `BudgetBar`: tokens and cost against budgets, warning near limit, clear budget-failure message
- [ ] `CostBreakdownChart` (Recharts): cost and tokens per agent and model, latency per execution
- [ ] Failure UX: sanitised reason banner with "run again with the same prompt"
- [ ] 429 and 5xx handling with friendly retry messages, `error.tsx` and `loading.tsx` per task tab segment
- [ ] `SessionExpiredDialog` preserving the route through `next`
- [ ] Demo mode (`NEXT_PUBLIC_DEMO_MODE`): MSW fixtures for the chosen demo question, recorded SSE sequence replayed at realistic speed, service worker served from `public/`, `DemoModeBanner` per the chosen signalling
- [ ] Seed one completed example run in the backend and link it from the task list
- [ ] Landing page (optional), signed-out `/`, redirect signed-in users to `/tasks`
- [ ] Accessibility sweep on drawers, dialogs and status colours
- [ ] Tests: unit (status mapping, citation parsing, formatters, stream reconnect), component (evidence drawer, citation chip, execute idempotence, uploader validation), one Playwright path (stubbed login, create, execute, report, open citation)
- [ ] Docker multi-stage build with `output: 'standalone'`, `BACKEND_URL` build arg or reverse proxy service, verify SSE through the final setup
- [ ] Run `next build && next start` and the whole demo script at least twice before demo day
- [ ] Final `MANIFEST.md` and `DESIGN.md` review

### Components

`CancelButton`, `ConfirmDialog`, `UsagePanel`, `BudgetBar`, `CostBreakdownChart`, `SessionExpiredDialog`, `DemoModeBanner`, optional landing sections.

**Done when:** The demo runs end to end on a production build, still works in demo mode if external APIs fail, passes `audit` and `detect` across the app, and every generated asset is optimised, logged and has a fallback.

---

# 8. API to screen mapping

| Endpoint | Used by | Phase |
| --- | --- | --- |
| `GET /api/me` | `useMe`, `(app)/layout.tsx`, `UserMenu` | F0 |
| `POST /api/research-tasks` | `NewTaskForm` | F0 |
| `GET /api/research-tasks` | Task list | F0 |
| `GET /api/research-tasks/{id}` | `TaskHeader`, stepper, polling | F0, F1 |
| `POST .../execute` | `ExecuteButton` | F1 |
| `GET .../subtasks` | Plan tab, graph | F1 |
| `GET .../executions` | Activity tab | F1 |
| `GET .../reports` | Overview, Report tab | F1 |
| `GET .../events` | Timeline history | F2 |
| `GET .../stream` | `useTaskStream` | F2 |
| `GET .../sources` | Sources tab | F2 |
| `GET .../evidence` | Evidence tab | F2 |
| `GET /api/evidence/{id}` | Evidence and citation drawers | F2, F4 |
| `POST .../documents` | `DocumentUploader` | F3 |
| `GET .../documents` | Documents tab | F3 |
| `GET /api/reports/{id}` | Report tab, `/reports/[reportId]` | F4 |
| `GET /api/reports/{id}/export` | `ExportMenu` | F4 |
| `POST .../cancel` | `CancelButton` | F5 |

---

# 9. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Design drifts between phases | Decision log and `extract` plus `document` at the end of every phase. Do not reopen locked choices |
| Time lost on endless live choices | Max 3 options, 10-minute time-box, default to the first recommendation |
| Generated assets look inconsistent | One style-lock prompt after the first accepted image, reused for all batches |
| Higgsfield credits run out | Asset budget in F0, batch generation, SVG and CSS fallbacks for every slot |
| Assets slow the app or break layout | Reserved slots with fixed dimensions, WebP or AVIF, lazy loading, posters for video |
| Generated imagery contains text or recognisable IP or people | Prompts forbid text, logos and people. Reject and regenerate if any appear |
| Impeccable command names differ in your version | Run `/impeccable` to list them and adjust the sequences |
| Impeccable output looks polished but breaks data states | Every page gate requires loading, empty, error and populated states, plus the real backend check |
| Backend phase not ready | MSW fixtures first in every phase |
| SSE buffered by Next.js proxying | Test in F2 on a production build, then `compress: false`, route-handler proxy or proxy settings. Polling fallback |
| OAuth or cookie problems behind the Next.js host | Same-origin proxying, public host in provider redirect URIs, forward-headers setting on Spring |
| Rewrites fixed at build time | `BACKEND_URL` build arg or reverse proxy |
| Hydration errors from browser-only libraries | `next/dynamic` with `ssr: false` |
| Works in dev, breaks in production | `next build && next start` early and before the demo |
| Untrusted content in claims, passages, reports | Sanitised markdown, no raw HTML, safe external links |
| External APIs fail during demo | Demo mode with replayed SSE and a seeded completed run |
| Scope creep | Follow the drop order in section 4 and the stop-early rule |

---

# 10. Definition of done for the core demo

A user signs in, submits one complex research question, and presses Execute. The Plan tab shows the subtasks and dependency graph filling in live, with distinct agents. The Activity timeline shows agents starting, tools running and sources being found. The Evidence tab shows each claim with its verification status and reason. The Report tab shows a structured report, and clicking any citation opens the claim, exact passage, source and verification history. The whole product looks like one deliberate design, passes `audit` and `detect`, and survives an external API outage through demo mode.

# 11. Open questions

1. Which Higgsfield plan and credit budget are available, and which models will you use for images vs loops?
2. Which harness runs Impeccable (Claude Code, Cursor, other), and does your installed version use `init` or `teach` and expose live variant iteration?
3. Who owns design decisions when choices conflict (single decider recommended, to protect the time-boxes)?
4. Who owns the frontend, and can F3 and F4 run in parallel?
5. Proxying choice: Next.js rewrites (build-time `BACKEND_URL`) or reverse proxy? Does SSE pass cleanly?
6. Next.js version, and does the team use the `src/` layout above?
7. Does the backend publish an OpenAPI spec for generated types?
8. Are `plan`, `output_payload` and the analysis labels stable enough to type, or loosely typed JSON at first?
9. PDF export: server-side from Spring, or browser print stylesheet?
10. Is the optional landing page worth the credits and time, given the judging criteria?
11. Dark mode and mobile: required for judging or skip?
12. The single demo research question, so demo-mode fixtures can be recorded from a real run.
