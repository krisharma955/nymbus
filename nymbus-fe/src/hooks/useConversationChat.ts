"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  ConversationMessageResponse,
  SendMessageRequest,
} from "@/types/nymbus";
import { api, ApiError } from "@/lib/api";
import { consumeSseStream, ParsedSseEvent } from "@/lib/sseParser";
import { getAuthHeaders } from "@/lib/auth";

interface UseConversationChatProps {
  conversationId: string | null;
  onResearchQueued?: (taskId: string) => void;
  onConversationUpdated?: () => void;
}

export function useConversationChat({
  conversationId,
  onResearchQueued,
  onConversationUpdated,
}: UseConversationChatProps) {
  const [messages, setMessages] = useState<ConversationMessageResponse[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isDocumentProcessing, setIsDocumentProcessing] = useState<boolean>(false);
  const [activeResearchTaskId, setActiveResearchTaskId] = useState<string | null>(null);
  const [activeResearchStatus, setActiveResearchStatus] = useState<string | null>(null);
  const [researchNote, setResearchNote] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeTempUserMsgIdRef = useRef<string | null>(null);
  const activeTempAssistantMsgIdRef = useRef<string | null>(null);
  const assistantDeltaBufferRef = useRef<string>("");

  // Clean up streaming on conversation change or unmount
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsDocumentProcessing(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Load message history for a conversation
  const loadMessages = useCallback(async (convId: string) => {
    cancelStream();
    setIsLoadingHistory(true);
    setStreamError(null);
    activeTempUserMsgIdRef.current = null;
    activeTempAssistantMsgIdRef.current = null;
    assistantDeltaBufferRef.current = "";

    try {
      const history = await api.listMessages(convId, undefined, 50);
      setMessages(history);

      // Check if any message contains an active research task
      for (const msg of history) {
        if (msg.role === "ASSISTANT" && msg.researchTaskId) {
          setActiveResearchTaskId(msg.researchTaskId);
          if (msg.metadata?.research?.status) {
            setActiveResearchStatus(String(msg.metadata.research.status));
          }
          break;
        }
      }
    } catch (err) {
      console.error("Failed to load conversation messages:", err);
      setStreamError(err instanceof Error ? err.message : "Failed to load messages");
      setMessages([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [cancelStream]);

  // Send message and stream response
  const sendMessage = useCallback(
    async (
      content: string,
      documentIds: string[] = [],
      deepResearch = false
    ) => {
      if (!conversationId) {
        throw new Error("Cannot send message: No active conversation");
      }
      if (!content.trim()) return;

      cancelStream();
      setStreamError(null);
      setIsStreaming(true);
      assistantDeltaBufferRef.current = "";

      const tempUserMsgId = `temp-user-${Date.now()}`;
      activeTempUserMsgIdRef.current = tempUserMsgId;

      // Optimistically add the user message
      const optimisticUserMsg: ConversationMessageResponse = {
        id: tempUserMsgId,
        conversationId,
        role: "USER",
        content,
        status: "COMPLETED",
        researchTaskId: null,
        metadata: {
          documentIds: documentIds.length > 0 ? documentIds : undefined,
          deepResearch: deepResearch ? true : undefined,
        },
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticUserMsg]);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const requestPayload: SendMessageRequest = {
        content,
        documentIds: documentIds.length > 0 ? documentIds : undefined,
        deepResearch: deepResearch ? true : undefined,
      };

      const authHeaders = getAuthHeaders();

      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/messages/stream`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "text/event-stream",
              ...authHeaders,
            },
            body: JSON.stringify(requestPayload),
            signal: abortController.signal,
          }
        );

        if (!response.ok) {
          let errText = `Stream request failed: ${response.statusText}`;
          try {
            const errJson = await response.json();
            if (errJson && (errJson.message || errJson.error)) {
              errText = errJson.message || errJson.error;
            }
          } catch {
            // non-json error
          }
          throw new ApiError(errText, response.status);
        }

        if (!response.body) {
          throw new Error("Response body is not readable");
        }

        let completedHandled = false;

        await consumeSseStream(
          response.body,
          (rawEvent: ParsedSseEvent) => {
            const eventType = rawEvent.event;
            let payload: Record<string, unknown> = {};

            if (rawEvent.data) {
              try {
                payload = JSON.parse(rawEvent.data);
              } catch (parseErr) {
                console.warn("Failed to parse SSE JSON data:", rawEvent.data, parseErr);
              }
            }

            switch (eventType) {
              case "CONNECTED": {
                // Connection established
                break;
              }

              case "USER_MESSAGE_SAVED": {
                const savedUserMsg = payload as unknown as ConversationMessageResponse;
                if (savedUserMsg?.id) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === activeTempUserMsgIdRef.current
                        ? { ...savedUserMsg }
                        : m
                    )
                  );
                  activeTempUserMsgIdRef.current = savedUserMsg.id;
                  onConversationUpdated?.();
                }
                break;
              }

              case "DOCUMENTS_PROCESSING": {
                setIsDocumentProcessing(true);
                break;
              }

              case "ASSISTANT_MESSAGE_STARTED":
              case "ASSISTANT_STARTED": {
                setIsDocumentProcessing(false);
                const tempAssistantId = `temp-assistant-${Date.now()}`;
                activeTempAssistantMsgIdRef.current = tempAssistantId;
                assistantDeltaBufferRef.current = "";

                const placeholderMsg: ConversationMessageResponse = {
                  id: tempAssistantId,
                  conversationId,
                  role: "ASSISTANT",
                  content: "",
                  status: "PENDING",
                  researchTaskId: null,
                  metadata: null,
                  createdAt: new Date().toISOString(),
                };

                setMessages((prev) => {
                  if (prev.some((m) => m.id === tempAssistantId)) return prev;
                  return [...prev, placeholderMsg];
                });
                break;
              }

              case "ASSISTANT_DELTA": {
                const deltaContent = typeof payload.content === "string" ? payload.content : "";
                if (deltaContent) {
                  if (deltaContent.startsWith(assistantDeltaBufferRef.current)) {
                    assistantDeltaBufferRef.current = deltaContent;
                  } else {
                    assistantDeltaBufferRef.current += deltaContent;
                  }

                  const currentText = assistantDeltaBufferRef.current;
                  setMessages((prev) => {
                    const tempId = activeTempAssistantMsgIdRef.current;
                    if (!tempId) return prev;
                    return prev.map((m) =>
                      m.id === tempId ? { ...m, content: currentText } : m
                    );
                  });
                }
                break;
              }

              case "RESEARCH_QUEUED": {
                const taskId = payload.taskId ? String(payload.taskId) : null;
                const status = payload.status ? String(payload.status) : "QUEUED";
                const note = payload.note ? String(payload.note) : undefined;

                if (taskId) {
                  setActiveResearchTaskId(taskId);
                  onResearchQueued?.(taskId);
                }
                setActiveResearchStatus(status);
                if (note) setResearchNote(note);

                setMessages((prev) => {
                  const tempId = activeTempAssistantMsgIdRef.current;
                  if (!tempId) return prev;
                  return prev.map((m) => {
                    if (m.id !== tempId) return m;
                    return {
                      ...m,
                      status: "RESEARCHING",
                      researchTaskId: taskId || m.researchTaskId,
                      metadata: {
                        ...(m.metadata || {}),
                        research: {
                          ...(m.metadata?.research || {}),
                          taskId: taskId || m.metadata?.research?.taskId,
                          status,
                          note,
                        },
                      },
                    };
                  });
                });
                break;
              }

              case "RESEARCH_PROGRESS": {
                const taskId = payload.taskId ? String(payload.taskId) : null;
                const status = payload.status ? String(payload.status) : "RUNNING";
                if (taskId) setActiveResearchTaskId(taskId);
                setActiveResearchStatus(status);

                setMessages((prev) => {
                  const tempId = activeTempAssistantMsgIdRef.current;
                  if (!tempId) return prev;
                  return prev.map((m) => {
                    if (m.id !== tempId) return m;
                    return {
                      ...m,
                      metadata: {
                        ...(m.metadata || {}),
                        research: {
                          ...(m.metadata?.research || {}),
                          status,
                        },
                      },
                    };
                  });
                });
                break;
              }

              case "ASSISTANT_MESSAGE_COMPLETED":
              case "ASSISTANT_COMPLETED": {
                completedHandled = true;
                const completedMsg = payload as unknown as ConversationMessageResponse;

                if (completedMsg?.id) {
                  setMessages((prev) => {
                    const tempId = activeTempAssistantMsgIdRef.current;
                    const exists = prev.some((m) => m.id === completedMsg.id);

                    if (exists) {
                      return prev
                        .filter((m) => m.id !== tempId)
                        .map((m) => (m.id === completedMsg.id ? completedMsg : m));
                    }

                    if (tempId && prev.some((m) => m.id === tempId)) {
                      return prev.map((m) => (m.id === tempId ? completedMsg : m));
                    }

                    return [...prev, completedMsg];
                  });

                  if (completedMsg.researchTaskId) {
                    setActiveResearchTaskId(completedMsg.researchTaskId);
                    onResearchQueued?.(completedMsg.researchTaskId);
                  }
                }
                setIsStreaming(false);
                setIsDocumentProcessing(false);
                onConversationUpdated?.();
                break;
              }

              case "ERROR": {
                const errorMsg =
                  typeof payload.error === "string"
                    ? payload.error
                    : "Error received from streaming endpoint";
                setStreamError(errorMsg);
                setIsStreaming(false);
                setIsDocumentProcessing(false);

                setMessages((prev) => {
                  const tempId = activeTempAssistantMsgIdRef.current;
                  if (!tempId) return prev;
                  return prev.map((m) =>
                    m.id === tempId ? { ...m, status: "FAILED" } : m
                  );
                });
                break;
              }

              default:
                break;
            }
          },
          abortController.signal
        );

        if (!completedHandled) {
          setIsStreaming(false);
          setIsDocumentProcessing(false);
        }
      } catch (err: unknown) {
        if (abortController.signal.aborted) {
          return;
        }
        console.error("Chat streaming error:", err);
        const errMsg = err instanceof Error ? err.message : "Stream connection failed";
        setStreamError(errMsg);
        setIsStreaming(false);
        setIsDocumentProcessing(false);

        setMessages((prev) => {
          const tempId = activeTempAssistantMsgIdRef.current;
          if (!tempId) return prev;
          return prev.map((m) =>
            m.id === tempId ? { ...m, status: "FAILED" } : m
          );
        });
      } finally {
        abortControllerRef.current = null;
      }
    },
    [conversationId, cancelStream, onResearchQueued, onConversationUpdated]
  );

  return {
    messages,
    setMessages,
    isLoadingHistory,
    isStreaming,
    isDocumentProcessing,
    activeResearchTaskId,
    activeResearchStatus,
    researchNote,
    streamError,
    loadMessages,
    sendMessage,
    cancelStream,
  };
}
