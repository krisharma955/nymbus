"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WorkflowEventResponse, WorkflowEventType } from "../types/nymbus";
import { SseStreamParser } from "../lib/sseParser";
import { getAuthHeaders } from "../lib/auth";
import { api } from "../lib/api";

interface StreamPayload {
  id?: string;
  eventType?: WorkflowEventType;
  message?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

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

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastEventIdRef = useRef<string | null>(null);

  const onEventRef = useRef(onEvent);
  const onCompletedRef = useRef(onCompleted);
  const onFailedRef = useRef(onFailed);

  useEffect(() => {
    onEventRef.current = onEvent;
    onCompletedRef.current = onCompleted;
    onFailedRef.current = onFailed;
  });

  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsConnected(false);
    setIsStreaming(false);
  }, []);

  const connect = useCallback(async () => {
    if (!taskId || !enabled) return;

    cleanup();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsStreaming(true);
    setError(null);

    // Initial fetch of existing events in case stream is fast or already completed
    try {
      const pastEvents = await api.getWorkflowEvents(taskId);
      if (!abortController.signal.aborted && pastEvents && pastEvents.length > 0) {
        setEvents(pastEvents);
        setLastEvent(pastEvents[pastEvents.length - 1]);
        if (pastEvents[pastEvents.length - 1].id) {
          lastEventIdRef.current = pastEvents[pastEvents.length - 1].id;
        }
      }
    } catch {
      // ignore
    }

    if (abortController.signal.aborted) return;

    const url = new URL(`/api/research-tasks/${taskId}/stream`, window.location.origin);
    if (lastEventIdRef.current) {
      url.searchParams.set("lastEventId", lastEventIdRef.current);
    }

    const parser = new SseStreamParser((parsedEvent) => {
      if (parsedEvent.event === "CONNECTED") {
        setIsConnected(true);
        setError(null);
        return;
      }

      try {
        let payload: StreamPayload = {};
        try {
          payload = JSON.parse(parsedEvent.data) as StreamPayload;
        } catch {
          payload = { message: parsedEvent.data };
        }

        const eventType = (payload.eventType || parsedEvent.event || "TASK_STARTED") as WorkflowEventType;
        const normalized: WorkflowEventResponse = {
          id: payload.id || parsedEvent.id || crypto.randomUUID(),
          researchTaskId: taskId,
          subTaskId: (payload.metadata?.subTaskId as string) || undefined,
          eventType,
          message: payload.message || "",
          metadata: payload.metadata || {},
          createdAt: payload.timestamp || new Date().toISOString(),
        };

        if (normalized.id) {
          lastEventIdRef.current = normalized.id;
        }

        setLastEvent(normalized);
        setEvents((prev) => {
          if (prev.some((e) => e.id === normalized.id)) return prev;
          return [...prev, normalized];
        });
        onEventRef.current?.(normalized);

        if (eventType === "TASK_COMPLETED") {
          onCompletedRef.current?.();
        } else if (eventType === "TASK_FAILED") {
          onFailedRef.current?.(normalized.message);
        }
      } catch (err) {
        console.warn("Failed to parse SSE payload:", err, parsedEvent.data);
      }
    });

    try {
      const authHeaders = getAuthHeaders();
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          ...authHeaders,
        },
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error(`Workflow stream failed with status ${res.status}`);
      }

      if (!res.body) {
        throw new Error("No response body available for workflow stream");
      }

      setIsConnected(true);
      const reader = res.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          parser.feed(value);
        }
      }
      parser.finish();
    } catch (err: unknown) {
      if (abortController.signal.aborted) return;
      console.warn("Workflow SSE stream error:", err);
      setError(err instanceof Error ? err.message : "Stream error");
    } finally {
      if (!abortController.signal.aborted) {
        setIsConnected(false);
        setIsStreaming(false);
      }
    }
  }, [taskId, enabled, cleanup]);

  useEffect(() => {
    if (taskId && enabled) {
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
