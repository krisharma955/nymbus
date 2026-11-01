# Nymbus: Verifiable Multi-Agent Research Platform

## Executive Overview

Nymbus is an enterprise-grade multi-agent research platform designed to decompose complex analytical inquiries into structured, verified dossiers. Conventional AI research systems and conversational interfaces often emit hallucination-prone summaries coupled with superficial top-level URLs. Nymbus enforces mathematical evidence traceability: every claim is extracted atomically, verified against exact source passages via a specialized verification agent, and attributed directly within an auditable execution graph.

The platform combines a modern Next.js 16 and React 19 frontend implementing the "Spatial Ledger" design language with a high-throughput Spring Boot 4 modular backend powered by Spring AI, PostgreSQL with pgvector, and OpenRouter LLM gateways.

---

## Architectural Principles

1. Complete Traceability: Conclusions in generated research reports must link directly to an inspectable source passage and a verifiable execution record. URLs alone do not qualify as evidence.
2. Calm Precision: The user interface prioritizes dense, scannable data layouts, architectural typography, and minimal visual distraction over decorative animations or generic chat tropes.
3. Detail on Demand: High-level executive summaries are presented first, with immediate progressive disclosure into underlying multi-agent execution DAGs, raw tool payloads, and verified quotes via sliding panels.
4. Honest State Telemetry: Live agent execution states, verification failures, retries, and confidence scores are streamed and reported accurately without masking background failures.

---

## System Architecture

Nymbus operates as an end-to-end distributed system consisting of two primary tiers: the Next.js conversational workspace client (`nymbus-fe`) and the Spring Boot multi-agent engine (`nymbus-be`).

```
+---------------------------------------------------------------------------------+
|                                 CLIENT TIER                                     |
|                                                                                 |
|   Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + Three.js 3D Plane     |
|                                                                                 |
|   +-----------------------+  +-----------------------+  +-------------------+   |
|   | Dialogue Stream View  |  | Multi-Agent DAG Trace |  | Evidence Drawer   |   |
|   +-----------------------+  +-----------------------+  +-------------------+   |
|               |                          |                        |             |
|   +-------------------------------------------------------------------------+   |
|   | High-Reliability W3C SSE Parser (Fetch API + ReadableStream + JWT Auth)  |   |
|   +-------------------------------------------------------------------------+   |
+---------------------------------------|-----------------------------------------+
                                        | HTTP / REST & POST/GET SSE Streams
+---------------------------------------v-----------------------------------------+
|                                BACKEND TIER                                     |
|                                                                                 |
|   Spring Boot 4.x + Spring AI + Spring Security (JWT / OAuth2 Resource Server)  |
|                                                                                 |
|   +-------------------------------------------------------------------------+   |
|   |                     Conversation & RAG Controller                       |   |
|   +-------------------------------------------------------------------------+   |
|               |                                           |                     |
|               v                                           v                     |
|   +-------------------------+             +---------------------------------+   |
|   | Standard Chat Assistant |             | Multi-Agent Research Swarm      |   |
|   | Grounded Conversation   |             | (Topological DAG Execution)     |   |
|   +-------------------------+             +---------------------------------+   |
|               |                                           |                     |
|               v                                           v                     |
|   +-------------------------------------------------------------------------+   |
|   |                      Autonomous Agent Pipeline                          |   |
|   |                                                                         |   |
|   |   [Orchestrator] -> [Research Agent] -> [Verification Gate]              |   |
|   |                            |                                            |   |
|   |                            v                                            |   |
|   |                 [Analysis & Synthesis] -> [Report Dossier]              |   |
|   +-------------------------------------------------------------------------+   |
|                                       |                                         |
|   +-------------------------------------------------------------------------+   |
|   | Storage: PostgreSQL 16 + pgvector (Embeddings, Entities, Audit Logs)    |   |
|   | Web Tooling: Tavily Search API, Firecrawl Extractors, Apache Tika      |   |
|   +-------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------+
```

---

## Multi-Agent Swarm Pipeline

When a user initiates an inquiry in Deep Research mode, the request is dispatched to the background agent swarm:

1. Orchestrator Agent: Analyzes the prompt, constructs a Directed Acyclic Graph (DAG) of discrete research subtasks with strict dependency resolution and cycle prevention, and persists the execution plan.
2. Research Agent: Concurrently processes scheduled subtasks. It invokes search tools (Tavily), crawls web pages, queries indexed document chunks, and retrieves candidate source passages.
3. Verification Gate: Inspects every extracted passage against atomic claim assertions. It evaluates semantic entailment, detects contradictions, assigns a verification confidence score (0.00 to 1.00), and records SHA-256 content digests.
4. Analysis Agent: Reconciles verified claims across multiple subtasks, detects disagreements between sources, identifies knowledge gaps, and triggers targeted re-research passes when necessary.
5. Report Dossier Agent: Compiles the final dossier into structured sections (Executive Summary, Technical Analysis, Risk & Countermeasure Ledger, Verifiable Evidence Citations), formatting each source reference into numeric bracketed markers (`[1]`, `[2]`).

---

## Key Capabilities

### Dual Execution Modes
- Standard Dialogue: Sub-second conversational responses grounded in attached conversation documents and web retrieval, streamed incrementally via Server-Sent Events.
- Autonomous Deep Research: Dispatches an asynchronous multi-agent task execution graph. Users observe the swarm's real-time progress through a live subtask DAG, inspectable agent events, and a final verified dossier.

### Real-Time Telemetry and SSE Parsing
- Native `EventSource` in standard browsers does not permit HTTP request bodies or custom `Authorization` headers. Nymbus implements a custom W3C-compliant SSE engine (`SseStreamParser`) operating over `fetch()` and `ReadableStream`.
- Streams events for both standard chat (`POST /api/conversations/{id}/messages/stream`) and multi-agent workflow telemetry (`GET /api/research-tasks/{id}/stream`).
- Handles arbitrary TCP chunk fragmentation, multibyte UTF-8 byte boundary splits, CR/LF normalizations, and reconnection state tracking (`Last-Event-ID`).

### Grounded RAG Document Intelligence
- Users can upload multiple document formats (`.pdf`, `.docx`, `.csv`, `.md`, `.txt`) scoped to individual conversations.
- Documents are parsed, chunked, vectorized via OpenRouter embedding endpoints, and stored in `pgvector`.
- Chat queries ground synthesis in uploaded files, with metadata linking directly back to the originating file chunk.

### Interactive Spatial Ledger Interface
- Custom dark-mode aesthetic utilizing obsidian surfaces (`#090A0D`), fine hairline dividers (`#1C202A`), and warm architectural gold accents (`#D4A373`).
- Interactive Three.js 3D Isometric Drafting Plane featuring raycast-enabled floating nodes and mouse parallax.
- Slide-out Evidence Drawer providing exact highlighted supporting quotes, confidence scores, and domain provenance upon clicking any citation pill.
- Complete export options for compiled research dossiers: Markdown, HTML, and JSON.

---

## Technology Stack

### Frontend (`nymbus-fe`)
- Framework: Next.js 16.4.3 (App Router, Turbopack)
- Core Library: React 19.3.0
- Styling: Tailwind CSS v4
- 3D Graphics: Three.js 0.187.0
- Icons: Lucide React 1.66.0
- Language: TypeScript 5.x
- Markdown Rendering: React-Markdown with custom GitHub Flavored Markdown (GFM) plugins

### Backend (`nymbus-be`)
- Language: Java 21 LTS
- Framework: Spring Boot 4.1.2
- AI Framework: Spring AI 2.0.1
- Security: Spring Security 6 with OAuth2 Resource Server & JWT validation
- Database: PostgreSQL 16 with `pgvector`
- Database Migrations: Flyway
- Search & Retrieval: Tavily API, Apache Tika document parser
- Model Provider: OpenRouter (configurable chat and embedding models)

---

## Centralized API Specification

All protected endpoints require the HTTP header:
`Authorization: Bearer <JWT_ACCESS_TOKEN>`

### 1. Conversation Endpoints
- `POST /api/conversations`: Create a new conversation thread.
- `GET /api/conversations?page=0&size=20`: List paginated conversation history.
- `GET /api/conversations/{id}`: Retrieve conversation details and metadata.
- `PATCH /api/conversations/{id}`: Update conversation title or properties.
- `DELETE /api/conversations/{id}`: Permanently delete a conversation.

### 2. Message & Streaming Endpoints
- `GET /api/conversations/{id}/messages?limit=50`: Retrieve chronologically ordered messages.
- `POST /api/conversations/{id}/messages`: Submit a standard synchronous message.
- `POST /api/conversations/{id}/messages/stream`: Submit message and establish real-time SSE stream.
  - Request body: `{"content": "string", "documentIds": ["uuid"], "deepResearch": boolean}`
  - Stream events: `CONNECTED`, `USER_MESSAGE_SAVED`, `DOCUMENTS_PROCESSING`, `ASSISTANT_MESSAGE_STARTED`, `ASSISTANT_DELTA`, `RESEARCH_QUEUED`, `RESEARCH_PROGRESS`, `ASSISTANT_MESSAGE_COMPLETED`, `ERROR`.

### 3. Document Ingestion (RAG) Endpoints
- `POST /api/conversations/{id}/documents`: Upload file (`multipart/form-data`) to conversation memory.
- `GET /api/conversations/{id}/documents`: List attached documents and parsing statuses.
- `GET /api/conversations/{id}/documents/{documentId}/status`: Poll processing progress (`UPLOADED`, `PROCESSING`, `READY`, `FAILED`).

### 4. Deep Research & Agent Swarm Endpoints
- `GET /api/conversations/{id}/research-tasks`: List all research tasks in a conversation.
- `GET /api/conversations/{id}/research-tasks/{taskId}`: Get high-level status of a research task.
- `GET /api/research-tasks/{taskId}/subtasks`: Fetch the topological subtask execution graph and statuses.
- `GET /api/research-tasks/{taskId}/events`: Fetch persisted workflow events for audit traces.
- `GET /api/research-tasks/{taskId}/stream`: Connect to real-time SSE stream for live agent events (`SUBTASK_STARTED`, `SOURCE_FOUND`, `CLAIM_VERIFIED`, etc.).

### 5. Report & Verification Endpoints
- `GET /api/reports/{reportId}`: Retrieve full structured dossier, sections, and citations.
- `GET /api/reports/{reportId}/export?format=markdown|html|json`: Export compiled dossier.
- `GET /api/evidence/{evidenceId}`: Retrieve exact source passage, confidence score, and raw locator.

---

## Repository Structure

```
nymbus/
|-- nymbus-fe/                           # Next.js 16 frontend application
|   |-- src/
|   |   |-- app/
|   |   |   |-- layout.tsx               # Root layout and theme providers
|   |   |   |-- page.tsx                 # Landing presentation & Spatial Ledger showcase
|   |   |   |-- chat/
|   |   |       |-- page.tsx             # Interactive research & conversation workspace
|   |   |-- components/
|   |   |   |-- SpatialLedgerPlane.tsx   # Three.js 3D isometric plane
|   |   |   |-- OrbitalGlobe.tsx         # Interactive global telemetry canvas
|   |   |   |-- chat/
|   |   |       |-- ChatMessageItem.tsx  # Message item with Deep Research trace widget
|   |   |       |-- SubtaskTimeline.tsx  # Multi-agent topological DAG execution timeline
|   |   |       |-- EvidenceDrawer.tsx   # Slide-out source passage verification panel
|   |   |       |-- ResearchReportModal.tsx # Full dossier inspection & export modal
|   |   |       |-- DocumentUploadModal.tsx # Conversation RAG ingestion modal
|   |   |       |-- DossierMarkdownRenderer.tsx # Markdown renderer with citation links
|   |   |-- hooks/
|   |   |   |-- useConversationChat.ts   # POST-based SSE hook for conversational stream
|   |   |   |-- useResearchTask.ts       # Decoupled task polling and state synchronization
|   |   |   |-- useWorkflowStream.ts     # GET-based SSE hook for live multi-agent events
|   |   |-- lib/
|   |   |   |-- api.ts                   # Centralized HTTP client and API service layer
|   |   |   |-- auth.ts                  # JWT token storage, URL initialization, headers
|   |   |   |-- sseParser.ts             # W3C-compliant SSE parser for ReadableStream
|   |   |-- types/
|   |       |-- nymbus.ts                # TypeScript domain models and API contracts
|   |-- package.json
|   |-- tsconfig.json
|   |-- next.config.ts                   # Proxy rewrites for /api/* to backend
|
|-- nymbus-be/                           # Spring Boot 4 backend modular monolith
|   |-- src/main/java/com/graviton/nymbus/
|   |   |-- agent/                       # Agent contracts, LLM service, tool abstractions
|   |   |-- conversation/                # Conversations, chat agent, and streaming SSE
|   |   |-- document/                    # Document parser, chunker, RAG vectorization
|   |   |-- evidence/                    # Atomic claim extraction and verification gate
|   |   |-- report/                      # Report compiler, sectioning, export formatters
|   |   |-- research/                    # Research task lifecycle and orchestrator
|   |   |-- source/                      # Web scraping, Tavily search, source tracking
|   |   |-- workflow/                    # Subtask DAG scheduling and SSE event broker
|   |   |-- config/                      # SecurityConfig, AiConfig, CorsConfiguration
|   |-- src/main/resources/
|   |   |-- application.yaml             # Core configuration and model parameters
|   |   |-- db/migration/                # Flyway relational schemas & pgvector DDL
|   |-- pom.xml
|
|-- PRD.md                               # Comprehensive Product Requirements Document
|-- PRODUCT.md                           # Product purpose, persona, and core principles
|-- DESIGN.md                            # Spatial Ledger design tokens and specification
|-- test-integration.mjs                 # Automated full-stack integration test harness
```

---

## Getting Started

### Prerequisites

- Node.js: Version 20.10.0 or higher
- npm: Version 10.0.0 or higher
- Java Development Kit (JDK): Version 21 LTS
- Apache Maven: Version 3.9 or higher
- PostgreSQL: Version 16 with `pgvector` extension installed
- API Keys: OpenRouter API key and Tavily Search API key

---

### Step 1: Backend Setup (`nymbus-be`)

1. Navigate to the backend directory:
   ```bash
   cd nymbus-be
   ```

2. Create a local environment configuration file:
   ```bash
   cp .env.example .env
   ```

3. Populate the required environment variables in `.env` (or configure your shell):
   ```properties
   SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/nymbus
   SPRING_DATASOURCE_USERNAME=postgres
   SPRING_DATASOURCE_PASSWORD=postgres

   OPENROUTER_API_KEY=your_openrouter_api_key
   OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
   OPENROUTER_EMBEDDING_MODEL=nvidia/nemotron-3.5-embed-1b:free

   TAVILY_API_KEY=your_tavily_api_key

   AUTH_REQUIRE_AUTH=false
   ```

4. Build and package the Spring Boot application:
   ```bash
   mvn clean install -DskipTests
   ```

5. Run the backend service:
   ```bash
   mvn spring-boot:run
   ```
   The backend server starts on `http://localhost:8080`.

---

### Step 2: Frontend Setup (`nymbus-fe`)

1. In a separate terminal session, navigate to the frontend directory:
   ```bash
   cd nymbus-fe
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create the local development environment configuration:
   ```bash
   cp .env.example .env.local
   ```

4. Configure `.env.local` to point to the backend instance:
   ```properties
   NEXT_PUBLIC_API_URL=http://localhost:8080
   BACKEND_URL=http://localhost:8080
   ```
   *Note: Next.js automatically rewrites `/api/*` requests to `BACKEND_URL` in development.*

5. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:3000`.

---

## Verification & Testing

### 1. Automated Integration Test Suite
To verify end-to-end functionality against a live backend, execute the integration test script from the frontend workspace:
```bash
node test-integration.mjs
```
The test suite performs the following checks:
- W3C SSE Stream Parser unit tests (fragmentation, UTF-8 boundaries, LF/CRLF).
- Authentication handshake and `/api/me` profile resolution.
- Conversation creation, title update, and deletion.
- Multi-part document upload and asynchronous status polling.
- Real-time message streaming via `POST /api/conversations/{id}/messages/stream`.
- Capture and validation of all SSE event payloads.

### 2. Frontend Build Verification
Verify type safety and compile the Next.js production build:
```bash
npx tsc --noEmit
npm run lint
npm run build
```

---

## Security Architecture

- Stateless Authentication: Microservices authenticate requests through stateless JWT Bearer tokens validated against public key endpoints or internal HMAC decoders.
- CORS Enforcement: Strict cross-origin resource sharing policies allow only configured origins (`http://localhost:3000` in development).
- Resource Isolation: Users can query and inspect only the conversations, documents, research tasks, and evidence records associated with their authenticated subject identifier.
- Multipart Ingestion Validation: All document uploads undergo strict MIME-type validation, content-length boundaries, and file extension checks before entering the vectorization pipeline.

---

## License

This software is licensed under the Apache License, Version 2.0. See the LICENSE file for details.
