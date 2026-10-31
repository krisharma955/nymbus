"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  ReportDetailResponse,
  ResearchTaskStatusResponse,
} from "@/types/nymbus";
import { api } from "@/lib/api";

interface UseResearchTaskProps {
  conversationId: string | null;
  taskId: string | null;
  enabled?: boolean;
  pollIntervalMs?: number;
  onStatusChange?: (status: ResearchTaskStatusResponse) => void;
  onCompleted?: (status: ResearchTaskStatusResponse, report: ReportDetailResponse | null) => void;
  onFailed?: (status: ResearchTaskStatusResponse, error: string) => void;
}

export function useResearchTask({
  conversationId,
  taskId,
  enabled = true,
  pollIntervalMs = 3000,
  onStatusChange,
  onCompleted,
  onFailed,
}: UseResearchTaskProps) {
  const [taskStatus, setTaskStatus] = useState<ResearchTaskStatusResponse | null>(null);
  const [report, setReport] = useState<ReportDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onStatusChangeRef = useRef(onStatusChange);
  const onCompletedRef = useRef(onCompleted);
  const onFailedRef = useRef(onFailed);
  const consecutiveFailuresRef = useRef<number>(0);
  const isExecutingRef = useRef<boolean>(false);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
    onCompletedRef.current = onCompleted;
    onFailedRef.current = onFailed;
  });

  const isPolling = Boolean(
    conversationId &&
      taskId &&
      enabled &&
      taskStatus?.status !== "COMPLETED" &&
      taskStatus?.status !== "FAILED"
  );

  const pollTask = useCallback(async () => {
    if (!conversationId || !taskId || isExecutingRef.current) return;

    isExecutingRef.current = true;
    try {
      const statusRes = await api.getConversationResearchTaskStatus(conversationId, taskId);
      consecutiveFailuresRef.current = 0;
      setError(null);
      setTaskStatus(statusRes);
      onStatusChangeRef.current?.(statusRes);

      if (statusRes.status === "COMPLETED") {
        let fetchedReport: ReportDetailResponse | null = null;
        if (statusRes.reportId) {
          try {
            fetchedReport = await api.getReportDetail(statusRes.reportId);
            setReport(fetchedReport);
          } catch (repErr) {
            console.error("Failed to fetch completed report:", repErr);
          }
        }
        onCompletedRef.current?.(statusRes, fetchedReport);
      } else if (statusRes.status === "FAILED" || statusRes.status === "CANCELLED") {
        const errMsg = statusRes.errorMessage || "Research task failed to complete";
        setError(errMsg);
        onFailedRef.current?.(statusRes, errMsg);
      }
    } catch (err) {
      consecutiveFailuresRef.current += 1;
      if (consecutiveFailuresRef.current > 5) {
        console.warn("Persistent failure polling research task:", err);
        setError("Failed to fetch research status after multiple attempts");
      }
    } finally {
      isExecutingRef.current = false;
    }
  }, [conversationId, taskId]);

  useEffect(() => {
    if (!conversationId || !taskId || !enabled) {
      return;
    }

    consecutiveFailuresRef.current = 0;

    // Trigger initial poll
    pollTask();

    const interval = setInterval(() => {
      pollTask();
    }, pollIntervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [conversationId, taskId, enabled, pollIntervalMs, pollTask]);

  return {
    taskStatus,
    report,
    isPolling,
    error,
    refreshStatus: pollTask,
  };
}
