package com.graviton.nymbus.conversation.service;

import com.graviton.nymbus.common.exception.ResourceNotFoundException;
import com.graviton.nymbus.conversation.config.ChatProperties;
import com.graviton.nymbus.conversation.entity.ConversationMessage;
import com.graviton.nymbus.conversation.entity.MessageStatus;
import com.graviton.nymbus.conversation.repository.ConversationMessageRepository;
import com.graviton.nymbus.document.entity.Document;
import com.graviton.nymbus.document.entity.DocumentProcessingStatus;
import com.graviton.nymbus.document.repository.DocumentRepository;
import com.graviton.nymbus.research.entity.ExecutionMode;
import com.graviton.nymbus.research.entity.ResearchTask;
import com.graviton.nymbus.research.entity.ResearchTaskDocument;
import com.graviton.nymbus.research.entity.TaskStatus;
import com.graviton.nymbus.research.repository.ResearchTaskDocumentRepository;
import com.graviton.nymbus.research.repository.ResearchTaskRepository;
import com.graviton.nymbus.user.entity.User;
import com.graviton.nymbus.user.repository.UserRepository;
import com.graviton.nymbus.workflow.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationResearchService {

    private final DocumentRepository documentRepository;
    private final ResearchTaskRepository researchTaskRepository;
    private final ResearchTaskDocumentRepository researchTaskDocumentRepository;
    private final ConversationMessageRepository conversationMessageRepository;
    private final UserRepository userRepository;
    private final WorkflowService workflowService;
    private final ChatProperties chatProperties;

    @Transactional(readOnly = true)
    public List<Document> validateAndCollectDocuments(UUID conversationId, List<UUID> documentIds, User user) {
        if (documentIds == null || documentIds.isEmpty()) {
            return Collections.emptyList();
        }

        List<Document> documents = new ArrayList<>();
        for (UUID docId : documentIds) {
            Document doc = documentRepository.findByIdAndConversationIdAndUserId(docId, conversationId, user.getId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Document not found or does not belong to conversation: " + docId));
            documents.add(doc);
        }
        return documents;
    }

    public boolean waitForDocumentsReady(List<Document> documents, Duration timeout) {
        if (documents == null || documents.isEmpty()) {
            return true;
        }

        long deadline = System.currentTimeMillis() + timeout.toMillis();
        while (System.currentTimeMillis() < deadline) {
            boolean allReady = true;
            for (Document d : documents) {
                Document fresh = documentRepository.findById(d.getId()).orElse(null);
                if (fresh == null || fresh.getProcessingStatus() == DocumentProcessingStatus.FAILED) {
                    return false;
                }
                if (fresh.getProcessingStatus() != DocumentProcessingStatus.READY) {
                    allReady = false;
                    break;
                }
            }

            if (allReady) {
                return true;
            }

            try {
                Thread.sleep(300);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return false;
            }
        }

        return false;
    }

    @Transactional
    public ResearchTask createResearchTask(
            UUID conversationId,
            String prompt,
            List<Document> documents,
            User user
    ) {
        long messageCount = conversationMessageRepository.countByConversationId(conversationId);
        int turnIndex = (int) (messageCount / 2) + 1;

        String title = prompt.length() > 60 ? prompt.substring(0, 57) + "..." : prompt;
        ResearchTask task = ResearchTask.builder()
                .user(user)
                .conversationId(conversationId)
                .turnIndex(turnIndex)
                .title(title)
                .prompt(prompt)
                .status(TaskStatus.PENDING)
                .executionMode(ExecutionMode.DEEP_RESEARCH)
                .build();

        task = researchTaskRepository.save(task);
        log.info("Created ResearchTask {} for conversation {} turn {}", task.getId(), conversationId, turnIndex);

        // Associate exact documents via research_task_documents
        if (documents != null && !documents.isEmpty()) {
            for (Document doc : documents) {
                ResearchTaskDocument rtd = ResearchTaskDocument.builder()
                        .researchTask(task)
                        .document(doc)
                        .build();
                researchTaskDocumentRepository.save(rtd);
            }
            log.info("Linked {} documents to research task {}", documents.size(), task.getId());
        }

        return task;
    }

    public void dispatchResearchTask(UUID taskId) {
        log.info("Dispatching research workflow for task {}", taskId);
        boolean started = workflowService.triggerExecution(taskId);
        if (started) {
            workflowService.runWorkflowAsync(taskId);
        }
    }

    @Transactional
    public ResearchTask createAndTriggerResearchTask(
            UUID conversationId,
            String prompt,
            List<Document> documents,
            User user
    ) {
        ResearchTask task = createResearchTask(conversationId, prompt, documents, user);
        dispatchResearchTask(task.getId());
        return task;
    }

    @Async("chatExecutor")
    public void watchReadinessAndStartResearchAsync(
            UUID conversationId,
            UUID assistantMessageId,
            String prompt,
            List<UUID> docIds,
            UUID userId
    ) {
        log.info("Watching background document readiness for conversation {} message {}", conversationId, assistantMessageId);
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return;
        }

        List<Document> documents = new ArrayList<>();
        for (UUID docId : docIds) {
            documentRepository.findByIdAndConversationIdAndUserId(docId, conversationId, userId).ifPresent(documents::add);
        }

        boolean ready = waitForDocumentsReady(documents, chatProperties.getBgDocReadinessTimeout());
        if (ready) {
            ResearchTask task = createResearchTask(conversationId, prompt, documents, user);
            updateAssistantMessageWithTask(assistantMessageId, task.getId(), MessageStatus.RESEARCHING, "QUEUED");
            dispatchResearchTask(task.getId());
        } else {
            log.warn("Documents for conversation {} failed to reach READY status within background timeout", conversationId);
            updateAssistantMessageWithTask(assistantMessageId, null, MessageStatus.FAILED, "DOCUMENT_PROCESSING_TIMEOUT");
        }
    }

    @Transactional
    public void updateAssistantMessageWithTask(UUID messageId, UUID taskId, MessageStatus status, String researchStatus) {
        conversationMessageRepository.findById(messageId).ifPresent(msg -> {
            msg.setStatus(status);
            if (taskId != null) {
                msg.setResearchTaskId(taskId);
            }
            Map<String, Object> meta = msg.getMetadata() != null ? new HashMap<>(msg.getMetadata()) : new HashMap<>();
            Map<String, Object> researchMeta = new HashMap<>();
            if (taskId != null) {
                researchMeta.put("taskId", taskId.toString());
            }
            researchMeta.put("status", researchStatus);
            meta.put("research", researchMeta);
            msg.setMetadata(meta);
            conversationMessageRepository.save(msg);
        });
    }
}
