package com.graviton.nymbus.conversation.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.graviton.nymbus.conversation.agent.ChatAgent;
import com.graviton.nymbus.conversation.config.ChatProperties;
import com.graviton.nymbus.conversation.dto.ChatAgentResponse;
import com.graviton.nymbus.conversation.dto.ConversationMessageResponse;
import com.graviton.nymbus.conversation.dto.SendMessageRequest;
import com.graviton.nymbus.conversation.entity.Conversation;
import com.graviton.nymbus.conversation.entity.ConversationMessage;
import com.graviton.nymbus.conversation.entity.MessageStatus;
import com.graviton.nymbus.document.entity.Document;
import com.graviton.nymbus.research.entity.ResearchTask;
import com.graviton.nymbus.user.entity.User;
import com.graviton.nymbus.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationChatService {

    private final ConversationService conversationService;
    private final ConversationMessageService conversationMessageService;
    private final ConversationContextService conversationContextService;
    private final ConversationSummaryService conversationSummaryService;
    private final ConversationResearchService conversationResearchService;
    private final ChatAgent chatAgent;
    private final CurrentUserService currentUserService;
    private final ChatProperties chatProperties;
    private final ObjectMapper objectMapper;
    private final Executor chatExecutor;

    public ConversationMessageResponse sendMessage(UUID conversationId, SendMessageRequest request) {
        User user = currentUserService.getCurrentUser();
        return sendMessage(conversationId, request, user);
    }

    public ConversationMessageResponse sendMessage(UUID conversationId, SendMessageRequest request, User user) {
        Conversation conversation = conversationService.getConversationWithOwnershipCheck(conversationId, user);

        List<UUID> attachedDocIds = request.documentIds();
        boolean hasDocs = !attachedDocIds.isEmpty();
        boolean isExplicitDeep = request.isDeepResearch();

        // 1. Validate attached documents if present
        List<Document> attachedDocs = hasDocs
                ? conversationResearchService.validateAndCollectDocuments(conversationId, attachedDocIds, user)
                : Collections.emptyList();

        // 2. Persist user message
        Map<String, Object> userMeta = new HashMap<>();
        if (hasDocs) {
            userMeta.put("documentIds", attachedDocIds.stream().map(UUID::toString).toList());
        }
        if (isExplicitDeep) {
            userMeta.put("deepResearch", true);
        }
        conversationMessageService.saveUserMessage(conversationId, request.content(), attachedDocIds, userMeta);
        conversationService.updateTitleIfDefault(conversationId, request.content());

        // 3. Coordinate Document Readiness if documents attached
        boolean docsReady = true;
        if (hasDocs) {
            docsReady = conversationResearchService.waitForDocumentsReady(
                    attachedDocs, chatProperties.getDocReadinessTimeout());
        }

        // 4. Assemble context (conversation summary, history, bounded web search, doc chunks, prior reports)
        ConversationContextService.AssembledContext context = conversationContextService.assembleContext(
                conversation, request.content(), attachedDocIds);

        // 5. Generate conversational answer through ChatAgent
        ChatAgentResponse chatResponse = chatAgent.generateAnswer(
                request.content(),
                context.conversationSummary(),
                context.recentHistory(),
                context.webResults(),
                context.documentChunks(),
                context.previousReports(),
                context.webSearchFailed()
        );

        // 6. Execute based on flow (Case A: normal chat, Case B: doc-attached research, Case C: explicit deep research)
        if (!hasDocs && !isExplicitDeep) {
            // Case A: Normal chat
            Map<String, Object> assistantMeta = new HashMap<>();
            assistantMeta.put("citations", chatResponse.citations());
            assistantMeta.put("fallback", chatResponse.isFallback());

            ConversationMessage assistantMsg = conversationMessageService.saveAssistantMessage(
                    conversationId,
                    chatResponse.contentMarkdown(),
                    MessageStatus.COMPLETED,
                    null,
                    assistantMeta
            );

            conversationSummaryService.checkAndTriggerSummary(conversationId);
            return ConversationMessageResponse.fromEntity(assistantMsg);
        }

        // Deep research path (Case B or Case C)
        if (hasDocs && !docsReady) {
            // Documents still ingesting
            Map<String, Object> assistantMeta = new HashMap<>();
            assistantMeta.put("citations", chatResponse.citations());
            assistantMeta.put("fallback", chatResponse.isFallback());
            Map<String, Object> researchMeta = new HashMap<>();
            researchMeta.put("status", "QUEUED");
            researchMeta.put("note", "Documents are still being processed. Research will initiate automatically upon ingestion completion.");
            assistantMeta.put("research", researchMeta);

            ConversationMessage assistantMsg = conversationMessageService.saveAssistantMessage(
                    conversationId,
                    chatResponse.contentMarkdown(),
                    MessageStatus.PENDING,
                    null,
                    assistantMeta
            );

            conversationResearchService.watchReadinessAndStartResearchAsync(
                    conversationId, assistantMsg.getId(), request.content(), attachedDocIds, user.getId());

            return ConversationMessageResponse.fromEntity(assistantMsg);
        }

        // Documents ready (or explicit deep research without docs)
        // CRITICAL: 1. Create task, 2. Save assistant message with task ID, 3. Dispatch task
        ResearchTask task = conversationResearchService.createResearchTask(
                conversationId, request.content(), attachedDocs, user);

        Map<String, Object> assistantMeta = new HashMap<>();
        assistantMeta.put("citations", chatResponse.citations());
        assistantMeta.put("fallback", chatResponse.isFallback());
        Map<String, Object> researchMeta = new HashMap<>();
        researchMeta.put("taskId", task.getId().toString());
        researchMeta.put("status", "RESEARCHING");
        assistantMeta.put("research", researchMeta);

        ConversationMessage assistantMsg = conversationMessageService.saveAssistantMessage(
                conversationId,
                chatResponse.contentMarkdown(),
                MessageStatus.RESEARCHING,
                task.getId(),
                assistantMeta
        );

        conversationResearchService.dispatchResearchTask(task.getId());
        conversationSummaryService.checkAndTriggerSummary(conversationId);
        return ConversationMessageResponse.fromEntity(assistantMsg);
    }

    public SseEmitter sendMessageStream(UUID conversationId, SendMessageRequest request) {
        User user = currentUserService.getCurrentUser();
        return sendMessageStream(conversationId, request, user);
    }

    public SseEmitter sendMessageStream(UUID conversationId, SendMessageRequest request, User user) {
        Conversation conversation = conversationService.getConversationWithOwnershipCheck(conversationId, user);

        SseEmitter emitter = new SseEmitter(180_000L); // 3-minute timeout

        emitter.onCompletion(() -> log.debug("SSE stream completed for conversation {}", conversationId));
        emitter.onTimeout(() -> {
            log.warn("SSE stream timed out for conversation {}", conversationId);
            emitter.complete();
        });
        emitter.onError(ex -> log.debug("SSE client error for conversation {}: {}", conversationId, ex.getMessage()));

        CompletableFuture.runAsync(() -> {
            try {
                // Initial handshake event immediately to flush HTTP headers to frontend
                emitEvent(emitter, "CONNECTED", Map.of(
                        "conversationId", conversationId,
                        "status", "CONNECTED"
                ));

                List<UUID> attachedDocIds = request.documentIds();
                boolean hasDocs = !attachedDocIds.isEmpty();
                boolean isExplicitDeep = request.isDeepResearch();

                // 1. Validate documents
                List<Document> attachedDocs = hasDocs
                        ? conversationResearchService.validateAndCollectDocuments(conversationId, attachedDocIds, user)
                        : Collections.emptyList();

                // 2. Persist user message FIRST
                Map<String, Object> userMeta = new HashMap<>();
                if (hasDocs) {
                    userMeta.put("documentIds", attachedDocIds.stream().map(UUID::toString).toList());
                }
                if (isExplicitDeep) {
                    userMeta.put("deepResearch", true);
                }
                ConversationMessage userMsg = conversationMessageService.saveUserMessage(
                        conversationId, request.content(), attachedDocIds, userMeta);
                conversationService.updateTitleIfDefault(conversationId, request.content());

                // Emit actual persisted user message
                emitEvent(emitter, "USER_MESSAGE_SAVED", ConversationMessageResponse.fromEntity(userMsg));

                // 3. Document processing status event if attached
                boolean docsReady = true;
                if (hasDocs) {
                    emitEvent(emitter, "DOCUMENTS_PROCESSING", Map.of(
                            "documentIds", attachedDocIds,
                            "status", "PROCESSING"
                    ));
                    docsReady = conversationResearchService.waitForDocumentsReady(
                            attachedDocs, chatProperties.getDocReadinessTimeout());
                }

                // 4. Notify assistant message generation starting
                emitEvent(emitter, "ASSISTANT_MESSAGE_STARTED", Map.of(
                        "conversationId", conversationId,
                        "status", "GENERATING"
                ));
                // Backward compatibility event name
                emitEvent(emitter, "ASSISTANT_STARTED", Map.of("status", "GENERATING"));

                // 5. Assemble context & generate answer
                ConversationContextService.AssembledContext context = conversationContextService.assembleContext(
                        conversation, request.content(), attachedDocIds);

                ChatAgentResponse chatResponse = chatAgent.generateAnswer(
                        request.content(),
                        context.conversationSummary(),
                        context.recentHistory(),
                        context.webResults(),
                        context.documentChunks(),
                        context.previousReports(),
                        context.webSearchFailed()
                );

                // Stream content delta
                emitEvent(emitter, "ASSISTANT_DELTA", Map.of("content", chatResponse.contentMarkdown()));

                // 6. Branch on research vs standard chat
                if (!hasDocs && !isExplicitDeep) {
                    Map<String, Object> assistantMeta = new HashMap<>();
                    assistantMeta.put("citations", chatResponse.citations());
                    assistantMeta.put("fallback", chatResponse.isFallback());

                    ConversationMessage assistantMsg = conversationMessageService.saveAssistantMessage(
                            conversationId,
                            chatResponse.contentMarkdown(),
                            MessageStatus.COMPLETED,
                            null,
                            assistantMeta
                    );

                    ConversationMessageResponse responseDto = ConversationMessageResponse.fromEntity(assistantMsg);
                    emitEvent(emitter, "ASSISTANT_MESSAGE_COMPLETED", responseDto);
                    emitEvent(emitter, "ASSISTANT_COMPLETED", responseDto);

                    conversationSummaryService.checkAndTriggerSummary(conversationId);
                    emitter.complete();
                    return;
                }

                // Deep research branches
                if (hasDocs && !docsReady) {
                    Map<String, Object> assistantMeta = new HashMap<>();
                    assistantMeta.put("citations", chatResponse.citations());
                    assistantMeta.put("fallback", chatResponse.isFallback());
                    Map<String, Object> researchMeta = new HashMap<>();
                    researchMeta.put("status", "QUEUED");
                    researchMeta.put("note", "Documents are still being processed. Research will initiate automatically upon ingestion completion.");
                    assistantMeta.put("research", researchMeta);

                    ConversationMessage assistantMsg = conversationMessageService.saveAssistantMessage(
                            conversationId,
                            chatResponse.contentMarkdown(),
                            MessageStatus.PENDING,
                            null,
                            assistantMeta
                    );

                    emitEvent(emitter, "RESEARCH_QUEUED", Map.of(
                            "status", "QUEUED",
                            "note", "Documents are still being processed."
                    ));

                    ConversationMessageResponse responseDto = ConversationMessageResponse.fromEntity(assistantMsg);
                    emitEvent(emitter, "ASSISTANT_MESSAGE_COMPLETED", responseDto);
                    emitEvent(emitter, "ASSISTANT_COMPLETED", responseDto);

                    conversationResearchService.watchReadinessAndStartResearchAsync(
                            conversationId, assistantMsg.getId(), request.content(), attachedDocIds, user.getId());

                    emitter.complete();
                    return;
                }

                // Documents ready or explicit deep research without docs
                ResearchTask task = conversationResearchService.createResearchTask(
                        conversationId, request.content(), attachedDocs, user);

                Map<String, Object> assistantMeta = new HashMap<>();
                assistantMeta.put("citations", chatResponse.citations());
                Map<String, Object> researchMeta = new HashMap<>();
                researchMeta.put("taskId", task.getId().toString());
                researchMeta.put("status", "RESEARCHING");
                assistantMeta.put("research", researchMeta);

                ConversationMessage assistantMsg = conversationMessageService.saveAssistantMessage(
                        conversationId,
                        chatResponse.contentMarkdown(),
                        MessageStatus.RESEARCHING,
                        task.getId(),
                        assistantMeta
                );

                emitEvent(emitter, "RESEARCH_QUEUED", Map.of("taskId", task.getId(), "status", "QUEUED"));

                // Dispatch task asynchronously
                conversationResearchService.dispatchResearchTask(task.getId());

                emitEvent(emitter, "RESEARCH_PROGRESS", Map.of("taskId", task.getId(), "status", "RUNNING"));

                ConversationMessageResponse responseDto = ConversationMessageResponse.fromEntity(assistantMsg);
                emitEvent(emitter, "ASSISTANT_MESSAGE_COMPLETED", responseDto);
                emitEvent(emitter, "ASSISTANT_COMPLETED", responseDto);

                conversationSummaryService.checkAndTriggerSummary(conversationId);
                emitter.complete();

            } catch (IOException e) {
                log.debug("SSE client connection closed during streaming for conversation {}: {}", conversationId, e.getMessage());
            } catch (Exception e) {
                log.error("Error in SSE chat stream for conversation {}: {}", conversationId, e.getMessage(), e);
                try {
                    emitEvent(emitter, "ERROR", Map.of("error", e.getMessage() != null ? e.getMessage() : "Unknown error"));
                } catch (Exception ignored) {}
                emitter.completeWithError(e);
            }
        }, chatExecutor);

        return emitter;
    }

    private void emitEvent(SseEmitter emitter, String eventName, Object payload) throws IOException {
        emitter.send(SseEmitter.event()
                .name(eventName)
                .data(objectMapper.writeValueAsString(payload)));
    }
}
