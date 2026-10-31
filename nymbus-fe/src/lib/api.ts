import {
  ConversationMessageResponse,
  ConversationResponse,
  CreateConversationRequest,
  CreateTaskRequest,
  DocumentChunkResponse,
  DocumentResponse,
  EvidenceDetailResponse,
  EvidenceResponse,
  ExecutionResponse,
  Page,
  ReportDetailResponse,
  ReportResponse,
  ResearchTaskStatusResponse,
  SendMessageRequest,
  SourceResponse,
  SubTaskResponse,
  TaskResponse,
  UpdateConversationRequest,
  UserMeResponse,
} from "../types/nymbus";
import { clearStoredToken, getAuthHeaders } from "./auth";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const authHeaders = getAuthHeaders();
  const headers = {
    Accept: "application/json",
    ...authHeaders,
    ...(init?.headers || {}),
  };

  const res = await fetch(url, {
    ...init,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      // Clear invalid / expired token
      clearStoredToken();
    }

    let errMessage = `HTTP error ${res.status}: ${res.statusText}`;
    let errData: unknown;
    try {
      errData = await res.json();
      if (errData && typeof errData === "object") {
        if ("message" in errData && typeof (errData as { message: unknown }).message === "string") {
          errMessage = (errData as { message: string }).message;
        } else if ("error" in errData && typeof (errData as { error: unknown }).error === "string") {
          errMessage = (errData as { error: string }).error;
        }
      }
    } catch {
      // not JSON
    }
    throw new ApiError(errMessage, res.status, errData);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  // --------------------------------------------------------------------------
  // User & Authentication
  // --------------------------------------------------------------------------
  async getCurrentUser(): Promise<UserMeResponse> {
    return fetchJson<UserMeResponse>("/api/me");
  },

  // --------------------------------------------------------------------------
  // Conversations
  // --------------------------------------------------------------------------
  async createConversation(request: CreateConversationRequest = {}): Promise<ConversationResponse> {
    return fetchJson<ConversationResponse>("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  },

  async listConversations(page = 0, size = 20): Promise<Page<ConversationResponse>> {
    return fetchJson<Page<ConversationResponse>>(`/api/conversations?page=${page}&size=${size}`);
  },

  async getConversation(id: string): Promise<ConversationResponse> {
    return fetchJson<ConversationResponse>(`/api/conversations/${id}`);
  },

  async updateConversation(id: string, request: UpdateConversationRequest): Promise<ConversationResponse> {
    return fetchJson<ConversationResponse>(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  },

  async deleteConversation(id: string): Promise<void> {
    return fetchJson<void>(`/api/conversations/${id}`, {
      method: "DELETE",
    });
  },

  // --------------------------------------------------------------------------
  // Messages
  // --------------------------------------------------------------------------
  async listMessages(
    conversationId: string,
    before?: string,
    limit = 50
  ): Promise<ConversationMessageResponse[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (before) {
      params.set("before", before);
    }
    return fetchJson<ConversationMessageResponse[]>(
      `/api/conversations/${conversationId}/messages?${params.toString()}`
    );
  },

  async sendMessage(
    conversationId: string,
    request: SendMessageRequest
  ): Promise<ConversationMessageResponse> {
    return fetchJson<ConversationMessageResponse>(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  },

  // --------------------------------------------------------------------------
  // Documents (Conversation RAG)
  // --------------------------------------------------------------------------
  async uploadConversationDocument(
    conversationId: string,
    file: File
  ): Promise<DocumentResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const authHeaders = getAuthHeaders();
    // Do NOT manually set Content-Type so browser sets boundary for multipart/form-data
    const res = await fetch(`/api/conversations/${conversationId}/documents`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...authHeaders,
      },
      body: formData,
    });

    if (!res.ok) {
      let errMessage = `Upload failed with status ${res.status}`;
      try {
        const data = await res.json();
        if (data && data.message) errMessage = data.message;
        else if (data && data.error) errMessage = data.error;
      } catch {
        // ignore
      }
      throw new ApiError(errMessage, res.status);
    }

    return res.json() as Promise<DocumentResponse>;
  },

  async listConversationDocuments(conversationId: string): Promise<DocumentResponse[]> {
    return fetchJson<DocumentResponse[]>(`/api/conversations/${conversationId}/documents`);
  },

  async getConversationDocumentStatus(
    conversationId: string,
    documentId: string
  ): Promise<DocumentResponse> {
    return fetchJson<DocumentResponse>(
      `/api/conversations/${conversationId}/documents/${documentId}/status`
    );
  },

  // --------------------------------------------------------------------------
  // Research Tasks (Conversation-scoped)
  // --------------------------------------------------------------------------
  async listConversationResearchTasks(conversationId: string): Promise<ResearchTaskStatusResponse[]> {
    return fetchJson<ResearchTaskStatusResponse[]>(
      `/api/conversations/${conversationId}/research-tasks`
    );
  },

  async getConversationResearchTaskStatus(
    conversationId: string,
    taskId: string
  ): Promise<ResearchTaskStatusResponse> {
    return fetchJson<ResearchTaskStatusResponse>(
      `/api/conversations/${conversationId}/research-tasks/${taskId}`
    );
  },

  // --------------------------------------------------------------------------
  // Reports & Citations
  // --------------------------------------------------------------------------
  async getReportDetail(reportId: string): Promise<ReportDetailResponse> {
    return fetchJson<ReportDetailResponse>(`/api/reports/${reportId}`);
  },

  getExportUrl(reportId: string, format: "markdown" | "html" | "json" = "markdown"): string {
    return `/api/reports/${reportId}/export?format=${format}`;
  },

  async getEvidenceDetail(evidenceId: string): Promise<EvidenceDetailResponse> {
    return fetchJson<EvidenceDetailResponse>(`/api/evidence/${evidenceId}`);
  },

  // --------------------------------------------------------------------------
  // Standalone Tasks (Legacy Workflow)
  // --------------------------------------------------------------------------
  async createTask(request: CreateTaskRequest): Promise<TaskResponse> {
    return fetchJson<TaskResponse>("/api/research-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  },

  async executeTask(taskId: string): Promise<TaskResponse> {
    return fetchJson<TaskResponse>(`/api/research-tasks/${taskId}/execute`, {
      method: "POST",
    });
  },

  async getTask(taskId: string): Promise<TaskResponse> {
    return fetchJson<TaskResponse>(`/api/research-tasks/${taskId}`);
  },

  async listTasks(page = 0, size = 20): Promise<Page<TaskResponse>> {
    return fetchJson<Page<TaskResponse>>(`/api/research-tasks?page=${page}&size=${size}`);
  },

  async getSubTasks(taskId: string): Promise<SubTaskResponse[]> {
    return fetchJson<SubTaskResponse[]>(`/api/research-tasks/${taskId}/subtasks`);
  },

  async getExecutions(taskId: string): Promise<ExecutionResponse[]> {
    return fetchJson<ExecutionResponse[]>(`/api/research-tasks/${taskId}/executions`);
  },

  async getSources(taskId: string): Promise<SourceResponse[]> {
    return fetchJson<SourceResponse[]>(`/api/research-tasks/${taskId}/sources`);
  },

  async getEvidence(taskId: string): Promise<EvidenceResponse[]> {
    return fetchJson<EvidenceResponse[]>(`/api/research-tasks/${taskId}/evidence`);
  },

  async getReports(taskId: string): Promise<ReportResponse[]> {
    return fetchJson<ReportResponse[]>(`/api/research-tasks/${taskId}/reports`);
  },

  async uploadDocument(taskId: string, file: File): Promise<DocumentResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const authHeaders = getAuthHeaders();
    const res = await fetch(`/api/research-tasks/${taskId}/documents`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...authHeaders,
      },
      body: formData,
    });

    if (!res.ok) {
      let errMessage = `Upload failed with status ${res.status}`;
      try {
        const data = await res.json();
        if (data && data.message) errMessage = data.message;
      } catch {
        // ignore
      }
      throw new ApiError(errMessage, res.status);
    }

    return res.json() as Promise<DocumentResponse>;
  },

  async listDocuments(taskId: string): Promise<DocumentResponse[]> {
    return fetchJson<DocumentResponse[]>(`/api/research-tasks/${taskId}/documents`);
  },

  async getDocumentChunks(taskId: string, documentId: string): Promise<DocumentChunkResponse[]> {
    return fetchJson<DocumentChunkResponse[]>(
      `/api/research-tasks/${taskId}/documents/${documentId}/chunks`
    );
  },
};
