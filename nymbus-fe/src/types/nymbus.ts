// ============================================================================
// NYMBUS CENTRALIZED TYPES & API CONTRACTS
// ============================================================================

// ----------------------------------------------------------------------------
// Core Enums & Literals
// ----------------------------------------------------------------------------

export type MessageRole = "USER" | "ASSISTANT" | "SYSTEM";

export type MessageStatus =
  | "PENDING"
  | "RESEARCHING"
  | "COMPLETED"
  | "FAILED";

export type TaskStatus =
  | "PENDING"
  | "PLANNING"
  | "READY"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type ExecutionMode = "STANDARD" | "DEEP_RESEARCH";

export type AgentCode =
  | "ORCHESTRATOR"
  | "RESEARCH"
  | "VERIFICATION"
  | "ANALYSIS"
  | "REPORT";

export type SubTaskStatus =
  | "PENDING"
  | "BLOCKED"
  | "READY"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type WorkflowEventType =
  | "TASK_STARTED"
  | "PLAN_CREATED"
  | "SUBTASK_STARTED"
  | "SUBTASK_COMPLETED"
  | "SOURCE_FOUND"
  | "CLAIM_EXTRACTED"
  | "CLAIM_VERIFIED"
  | "CLAIM_REJECTED"
  | "RE_RESEARCH_TRIGGERED"
  | "ANALYSIS_COMPLETED"
  | "REPORT_GENERATED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_PROCESSED"
  | "TASK_COMPLETED"
  | "TASK_FAILED"
  | "RETRY_SCHEDULED";

export type SourceType = "WEB" | "DOCUMENT" | "USER_UPLOAD";

export type VerificationStatus =
  | "VERIFIED"
  | "REFUTED"
  | "INCONCLUSIVE"
  | "UNVERIFIED";

export type ReportStatus = "GENERATING" | "COMPLETED" | "FAILED";

export type DocumentProcessingStatus =
  | "UPLOADED"
  | "PENDING"
  | "PROCESSING"
  | "PARSING"
  | "CHUNKING"
  | "EMBEDDING"
  | "READY"
  | "COMPLETED"
  | "FAILED";

export type UserRole = "USER" | "ADMIN";

// ----------------------------------------------------------------------------
// 1. Conversations API Contracts
// ----------------------------------------------------------------------------

export interface ConversationResponse {
  id: string;
  userId?: string | null;
  title: string;
  summary?: string | null;
  summaryUpdatedAt?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationRequest {
  title?: string;
}

export interface UpdateConversationRequest {
  title: string;
}

// ----------------------------------------------------------------------------
// 2. Messages API Contracts
// ----------------------------------------------------------------------------

export interface CitationDto {
  id: string;
  sourceType: string;
  title: string;
  url: string;
  documentId?: string | null;
  chunkId?: string | null;
  excerpt: string;
}

export interface ReportReferenceDto {
  taskId: string;
  reportId: string;
  turnIndex: number;
  title: string;
  executiveSummary?: string | null;
}

export interface ResearchMetadata {
  taskId?: string;
  status?: TaskStatus | string;
  note?: string;
  reportId?: string;
  reportTitle?: string;
  [key: string]: unknown;
}

export interface ConversationMessageMetadata {
  citations?: CitationDto[];
  research?: ResearchMetadata;
  documentIds?: string[];
  deepResearch?: boolean;
  [key: string]: unknown;
}

export interface ConversationMessageResponse {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  researchTaskId?: string | null;
  metadata?: ConversationMessageMetadata | null;
  createdAt: string;
}

export interface SendMessageRequest {
  content: string;
  documentIds?: string[];
  deepResearch?: boolean;
}

// ----------------------------------------------------------------------------
// 3. Documents API Contracts
// ----------------------------------------------------------------------------

export interface DocumentResponse {
  id: string;
  fileName: string;
  filename?: string; // Compatibility alias
  contentType: string;
  fileSizeBytes: number;
  processingStatus: DocumentProcessingStatus;
  conversationId?: string | null;
  researchTaskId?: string | null;
  messageId?: string | null;
  objectKey?: string;
  checksumSha256?: string;
  processingError?: string | null;
  errorMessage?: string | null; // Compatibility alias
  chunkCount?: number;
  createdAt: string;
  updatedAt?: string;
  processedAt?: string | null;
}

export interface DocumentChunkResponse {
  id: string;
  documentId: string;
  chunkIndex: number;
  chunkText: string;
  tokenCount: number;
  charOffsetStart: number;
  charOffsetEnd: number;
}

// ----------------------------------------------------------------------------
// 4. Research API Contracts
// ----------------------------------------------------------------------------

export interface ResearchTaskStatusResponse {
  taskId: string;
  conversationId?: string | null;
  messageId?: string | null;
  status: TaskStatus;
  executionMode: ExecutionMode;
  title: string;
  reportId?: string | null;
  reportTitle?: string | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CitationSourceDto {
  sourceId: string;
  title?: string;
  url?: string;
  domain?: string;
  sourceType: SourceType;
  sourceLocator?: string;
}

export interface ReportCitationResponse {
  id: string;
  citationLabel: string;
  evidenceId: string;
  claim: string;
  supportingPassage: string;
  verificationStatus: VerificationStatus;
  confidenceScore: number;
  sources: CitationSourceDto[];
}

export interface ReportSectionResponse {
  id: string;
  reportId: string;
  sectionKey: string;
  title: string;
  contentMarkdown: string;
  sectionOrder: number;
  citations: ReportCitationResponse[];
  createdAt: string;
}

export type ResearchReportSection = ReportSectionResponse;

export interface ReportDetailResponse {
  id: string;
  researchTaskId: string;
  version: number;
  title: string;
  executiveSummary?: string | null;
  status: ReportStatus;
  contentMarkdown?: string | null;
  generatedByExecutionId?: string | null;
  sections: ReportSectionResponse[];
  wordCount?: number;
  createdAt: string;
  completedAt?: string | null;
}

export type ResearchReportResponse = ReportDetailResponse;

export interface ReportResponse {
  id: string;
  researchTaskId: string;
  version: number;
  title: string;
  executiveSummary?: string | null;
  status: ReportStatus;
  contentMarkdown?: string | null;
  generatedByExecutionId?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

// ----------------------------------------------------------------------------
// 5. Research Task (Legacy & Internal Workflow)
// ----------------------------------------------------------------------------

export interface CreateTaskRequest {
  title: string;
  prompt: string;
  executionMode?: ExecutionMode;
  tokenBudget?: number;
  costBudgetUsd?: number;
}

export interface TaskResponse {
  id: string;
  userId: string;
  title: string;
  prompt: string;
  status: TaskStatus;
  executionMode: ExecutionMode;
  plan?: Record<string, unknown> | null;
  failureReason?: string | null;
  tokenBudget?: number | null;
  tokensUsed: number;
  costBudgetUsd?: number | null;
  costUsedUsd?: number | null;
  version: number;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubTaskResponse {
  id: string;
  researchTaskId: string;
  agentCode: AgentCode;
  title: string;
  description: string;
  status: SubTaskStatus;
  priority: number;
  inputPayload?: Record<string, unknown> | null;
  resultSummary?: string | null;
  version: number;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface ExecutionResponse {
  id: string;
  subTaskId: string;
  agentCode: AgentCode;
  modelIdentifier: string;
  status: string;
  attemptNumber: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  startedAt: string;
  completedAt?: string | null;
}

export interface WorkflowEventResponse {
  id: string;
  researchTaskId?: string;
  subTaskId?: string;
  agentExecutionId?: string;
  eventType: WorkflowEventType;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SourceResponse {
  id: string;
  researchTaskId?: string;
  documentId?: string | null;
  url?: string | null;
  canonicalUrlHash?: string | null;
  title?: string | null;
  domain?: string | null;
  sourceType: SourceType;
  publisher?: string | null;
  publishedAt?: string | null;
  cleanedText?: string | null;
  retrievedAt: string;
  rawMetadata?: Record<string, unknown>;
}

export interface EvidenceResponse {
  id: string;
  researchTaskId?: string;
  createdByExecutionId?: string;
  claim: string;
  supportingPassage?: string;
  claimType?: string;
  verificationStatus: VerificationStatus;
  confidenceScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceSourceResponse {
  id: string;
  evidenceId: string;
  sourceId: string;
  supportType: "DIRECT" | "INDIRECT" | "CONTRADICTING";
  paragraphIndex?: number | null;
  charOffsetStart?: number | null;
  charOffsetEnd?: number | null;
  createdAt: string;
}

export interface VerificationResultResponse {
  id: string;
  evidenceId: string;
  verificationAgentExecutionId?: string;
  status: VerificationStatus;
  confidenceScore?: number;
  reasoning?: string;
  evaluatedAt: string;
}

export interface EvidenceDetailResponse {
  evidence: EvidenceResponse;
  sources: EvidenceSourceResponse[];
  verificationResults: VerificationResultResponse[];
}

// ----------------------------------------------------------------------------
// 6. Pagination & Commons
// ----------------------------------------------------------------------------

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty?: boolean;
}

// ----------------------------------------------------------------------------
// 7. SSE Event Payloads
// ----------------------------------------------------------------------------

export interface ConnectedEventPayload {
  conversationId: string;
  status: "CONNECTED";
}

export type UserMessageSavedPayload = ConversationMessageResponse;

export interface DocumentsProcessingPayload {
  documentIds: string[];
  status: "PROCESSING";
}

export interface AssistantMessageStartedPayload {
  conversationId?: string;
  status: "GENERATING";
}

export interface AssistantDeltaPayload {
  content: string;
}

export interface ResearchQueuedPayload {
  taskId?: string;
  status: "QUEUED" | string;
  note?: string;
}

export interface ResearchProgressPayload {
  taskId: string;
  status: "RUNNING" | string;
}

export type AssistantMessageCompletedPayload = ConversationMessageResponse;

export interface ErrorEventPayload {
  error: string;
}

export type SseEventMap = {
  CONNECTED: ConnectedEventPayload;
  USER_MESSAGE_SAVED: UserMessageSavedPayload;
  DOCUMENTS_PROCESSING: DocumentsProcessingPayload;
  ASSISTANT_MESSAGE_STARTED: AssistantMessageStartedPayload;
  ASSISTANT_STARTED: AssistantMessageStartedPayload;
  ASSISTANT_DELTA: AssistantDeltaPayload;
  RESEARCH_QUEUED: ResearchQueuedPayload;
  RESEARCH_PROGRESS: ResearchProgressPayload;
  ASSISTANT_MESSAGE_COMPLETED: AssistantMessageCompletedPayload;
  ASSISTANT_COMPLETED: AssistantMessageCompletedPayload;
  ERROR: ErrorEventPayload;
};

export type SseEventName = keyof SseEventMap;

// ----------------------------------------------------------------------------
// 8. Auth API Contracts
// ----------------------------------------------------------------------------

export interface UserMeResponse {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  avatarUrl?: string | null;
  role: UserRole;
}
