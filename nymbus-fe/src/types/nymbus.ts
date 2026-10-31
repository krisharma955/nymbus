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
  | "READY"
  | "COMPLETED"
  | "FAILED";

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
  createdAt: string;
  completedAt?: string | null;
}

export interface DocumentResponse {
  id: string;
  researchTaskId?: string;
  fileName: string;
  objectKey: string;
  contentType: string;
  fileSizeBytes: number;
  checksumSha256: string;
  processingStatus: DocumentProcessingStatus;
  processingError?: string | null;
  createdAt: string;
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

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
