import {
  CreateTaskRequest,
  DocumentChunkResponse,
  DocumentResponse,
  EvidenceDetailResponse,
  EvidenceResponse,
  ExecutionResponse,
  Page,
  ReportDetailResponse,
  ReportResponse,
  SourceResponse,
  SubTaskResponse,
  TaskResponse,
} from "../types/nymbus";

class ApiError extends Error {
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
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    let errMessage = `HTTP error ${res.status}: ${res.statusText}`;
    let errData: unknown;
    try {
      errData = await res.json();
      if (errData && typeof errData === "object" && "message" in errData) {
        errMessage = String((errData as { message: unknown }).message);
      }
    } catch {
      // not JSON
    }
    throw new ApiError(errMessage, res.status, errData);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Tasks
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

  // Phase 4 Reports & Citations
  async getReportDetail(reportId: string): Promise<ReportDetailResponse> {
    return fetchJson<ReportDetailResponse>(`/api/reports/${reportId}`);
  },

  getExportUrl(reportId: string, format: "markdown" | "html" | "json" = "markdown"): string {
    return `/api/reports/${reportId}/export?format=${format}`;
  },

  // Evidence Details
  async getEvidenceDetail(evidenceId: string): Promise<EvidenceDetailResponse> {
    return fetchJson<EvidenceDetailResponse>(`/api/evidence/${evidenceId}`);
  },

  // Documents (RAG)
  async uploadDocument(taskId: string, file: File): Promise<DocumentResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/research-tasks/${taskId}/documents`, {
      method: "POST",
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
    return fetchJson<DocumentChunkResponse[]>(`/api/research-tasks/${taskId}/documents/${documentId}/chunks`);
  },
};
