"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WorkflowEventResponse, WorkflowEventType } from "../types/nymbus";

interface StreamPayload {
  id?: string;
  eventType?: WorkflowEventType;
  message?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

const ALL_EVENT_TYPES: WorkflowEventType[] = [
  "TASK_STARTED",
  "PLAN_CREATED",
  "SUBTASK_STARTED",
  "SUBTASK_COMPLETED",
  "SOURCE_FOUND",
  "CLAIM_EXTRACTED",
  "CLAIM_VERIFIED",
  "CLAIM_REJECTED",
  "RE_RESEARCH_TRIGGERED",
  "ANALYSIS_COMPLETED",
  "REPORT_GENERATED",
  "DOCUMENT_UPLOADED",
  "DOCUMENT_PROCESSED",
  "TASK_COMPLETED",
  "TASK_FAILED",
  "RETRY_SCHEDULED",
];

interface UseWorkflowStreamProps {
  taskId: string | null;
  enabled?: boolean;
  onEvent?: (event: WorkflowEventResponse) => void;
  onCompleted?: () => void;
  onFailed?: (reason?: string) => void;
}

export function useWorkflowStream({
  taskId,
  enabled = true,
  onEvent,
  onCompleted,
  onFailed,
}: UseWorkflowStreamProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [events, setEvents] = useState<WorkflowEventResponse[]>([]);
  const [lastEvent, setLastEvent] = useState<WorkflowEventResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const lastEventIdRef = useRef<string | null>(null);

  // Keep latest callbacks in refs so connect doesn't recreate when parent re-renders
  const onEventRef = useRef(onEvent);
  const onCompletedRef = useRef(onCompleted);
  const onFailedRef = useRef(onFailed);

  useEffect(() => {
    onEventRef.current = onEvent;
    onCompletedRef.current = onCompleted;
    onFailedRef.current = onFailed;
  });

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setIsStreaming(false);
  }, []);

  const connect = useCallback(() => {
    if (!taskId || !enabled) return;

    cleanup();

    const url = new URL(`/api/research-tasks/${taskId}/stream`, window.location.origin);
    if (lastEventIdRef.current) {
      url.searchParams.set("lastEventId", lastEventIdRef.current);
    }

    const es = new EventSource(url.toString());
    eventSourceRef.current = es;
    setIsStreaming(true);
    setError(null);

    const handlePayload = (eventType: WorkflowEventType, dataText: string, eventId?: string) => {
      try {
        const parsed = JSON.parse(dataText) as StreamPayload;
        const normalized: WorkflowEventResponse = {
          id: parsed.id || eventId || crypto.randomUUID(),
          researchTaskId: taskId,
          eventType,
          message: parsed.message || "",
          metadata: parsed.metadata || {},
          createdAt: parsed.timestamp || new Date().toISOString(),
        };

        if (normalized.id) {
          lastEventIdRef.current = normalized.id;
        }

        setLastEvent(normalized);
        setEvents((prev) => [...prev, normalized]);
        onEventRef.current?.(normalized);

        if (eventType === "TASK_COMPLETED") {
          onCompletedRef.current?.();
          cleanup();
        } else if (eventType === "TASK_FAILED") {
          onFailedRef.current?.(normalized.message);
          cleanup();
        }
      } catch (err) {
        console.warn("Failed to parse SSE payload:", err, dataText);
      }
    };

    es.addEventListener("CONNECTED", () => {
      setIsConnected(true);
      setError(null);
    });

    ALL_EVENT_TYPES.forEach((type) => {
      es.addEventListener(type, (evt: MessageEvent) => {
        handlePayload(type, evt.data, evt.lastEventId);
      });
    });

    es.onmessage = (evt: MessageEvent) => {
      try {
        const parsed = JSON.parse(evt.data) as StreamPayload;
        const type = parsed.eventType || "TASK_STARTED";
        handlePayload(type, evt.data, evt.lastEventId);
      } catch {
        // raw string
      }
    };

    es.onerror = () => {
      // EventSource tries reconnecting automatically; if state is closed, mark dead
      if (es.readyState === EventSource.CLOSED) {
        setIsConnected(false);
        setIsStreaming(false);
      } else {
        setIsConnected(false);
      }
    };
  }, [taskId, enabled, cleanup]);

  useEffect(() => {
    if (taskId && enabled) {
      setEvents([]);
      lastEventIdRef.current = null;
      connect();
    } else {
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [taskId, enabled, connect, cleanup]);

  return {
    isConnected,
    isStreaming,
    events,
    lastEvent,
    error,
    reconnect: connect,
    disconnect: cleanup,
  };
}
