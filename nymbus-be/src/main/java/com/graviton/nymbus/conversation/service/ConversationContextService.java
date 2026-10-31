package com.graviton.nymbus.conversation.service;

import com.graviton.nymbus.conversation.config.ChatProperties;
import com.graviton.nymbus.conversation.dto.ReportReferenceDto;
import com.graviton.nymbus.conversation.entity.Conversation;
import com.graviton.nymbus.conversation.entity.ConversationMessage;
import com.graviton.nymbus.conversation.entity.MessageRole;
import com.graviton.nymbus.document.entity.DocumentChunk;
import com.graviton.nymbus.document.service.DocumentService;
import com.graviton.nymbus.report.entity.ResearchReport;
import com.graviton.nymbus.report.repository.ResearchReportRepository;
import com.graviton.nymbus.research.entity.ResearchTask;
import com.graviton.nymbus.research.entity.TaskStatus;
import com.graviton.nymbus.research.repository.ResearchTaskRepository;
import com.graviton.nymbus.tool.WebSearchTool;
import com.graviton.nymbus.tool.model.SearchResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationContextService {

    private final ConversationMessageService conversationMessageService;
    private final DocumentService documentService;
    private final WebSearchTool webSearchTool;
    private final ResearchTaskRepository researchTaskRepository;
    private final ResearchReportRepository researchReportRepository;
    private final ChatProperties chatProperties;

    public record AssembledContext(
            String contextualQuery,
            String conversationSummary,
            List<ConversationMessage> recentHistory,
            List<SearchResult> webResults,
            List<DocumentChunk> documentChunks,
            List<ReportReferenceDto> previousReports,
            boolean webSearchFailed
    ) {}

    @Transactional(readOnly = true)
    public AssembledContext assembleContext(Conversation conversation, String currentUserMessage, List<UUID> attachedDocIds) {
        UUID conversationId = conversation.getId();

        // 1. Conversation summary
        String summary = conversation.getSummary();

        // 2. Recent history
        List<ConversationMessage> history = conversationMessageService.getRecentMessages(
                conversationId, chatProperties.getMaxHistoryMessages());

        // 3. Construct contextual web search query
        String contextualQuery = buildContextualSearchQuery(currentUserMessage, history);

        // 4. Perform bounded web search with Tavily
        List<SearchResult> webResults = Collections.emptyList();
        boolean webSearchFailed = false;
        try {
            webResults = webSearchTool.search(contextualQuery, chatProperties.getMaxSearchResults());
        } catch (Exception e) {
            log.warn("Web search failed for query '{}': {}. Proceeding without fresh web results.", contextualQuery, e.getMessage());
            webSearchFailed = true;
        }

        // 5. Retrieve relevant document chunks
        List<DocumentChunk> docChunks = Collections.emptyList();
        try {
            docChunks = documentService.searchConversationChunks(
                    conversationId,
                    contextualQuery,
                    chatProperties.getRetrievedChunkCount(),
                    chatProperties.getMaxVectorDistance()
            );
        } catch (Exception e) {
            log.debug("Document retrieval in conversation failed or empty: {}", e.getMessage());
        }

        // 6. Retrieve completed previous research reports
        List<ReportReferenceDto> previousReports = new ArrayList<>();
        try {
            List<ResearchTask> tasks = researchTaskRepository.findByConversationIdOrderByCreatedAtDesc(conversationId);
            for (ResearchTask t : tasks) {
                if (t.getStatus() == TaskStatus.COMPLETED) {
                    Optional<ResearchReport> repOpt = researchReportRepository.findTopByResearchTaskIdOrderByVersionDesc(t.getId());
                    repOpt.ifPresent(report -> previousReports.add(new ReportReferenceDto(
                            t.getId(),
                            report.getId(),
                            t.getTurnIndex(),
                            report.getTitle(),
                            report.getExecutiveSummary()
                    )));
                }
            }
        } catch (Exception e) {
            log.debug("Failed to retrieve previous reports: {}", e.getMessage());
        }

        // 7. Enforce prompt character budget
        List<ConversationMessage> budgetedHistory = enforceHistoryBudget(history, chatProperties.getMaxContextChars());

        return new AssembledContext(
                contextualQuery,
                summary,
                budgetedHistory,
                webResults,
                docChunks,
                previousReports,
                webSearchFailed
        );
    }

    public String buildContextualSearchQuery(String currentMessage, List<ConversationMessage> history) {
        if (currentMessage == null || currentMessage.isBlank()) {
            return "";
        }

        String cleaned = currentMessage.trim();
        if (history == null || history.isEmpty()) {
            return cleaned;
        }

        // Look for prior user messages to provide context if current message is short/elliptical
        if (cleaned.length() < 60 || isFollowUpQuestion(cleaned)) {
            for (int i = history.size() - 1; i >= 0; i--) {
                ConversationMessage prev = history.get(i);
                if (prev.getRole() == MessageRole.USER && !prev.getContent().equalsIgnoreCase(cleaned)) {
                    String prevSubject = prev.getContent().trim();
                    if (prevSubject.length() > 80) {
                        prevSubject = prevSubject.substring(0, 80);
                    }
                    return prevSubject + " " + cleaned;
                }
            }
        }

        return cleaned;
    }

    private boolean isFollowUpQuestion(String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        return lower.startsWith("what about")
                || lower.startsWith("how about")
                || lower.startsWith("why")
                || lower.startsWith("and ")
                || lower.startsWith("tell me more")
                || lower.startsWith("compare")
                || lower.contains(" pricing")
                || lower.contains(" that ")
                || lower.contains(" this ")
                || lower.contains(" these ")
                || lower.contains(" those ");
    }

    private List<ConversationMessage> enforceHistoryBudget(List<ConversationMessage> history, int maxChars) {
        if (history == null || history.isEmpty()) {
            return Collections.emptyList();
        }

        int currentChars = 0;
        List<ConversationMessage> retained = new ArrayList<>();
        // Iterate backwards from most recent to oldest
        for (int i = history.size() - 1; i >= 0; i--) {
            ConversationMessage msg = history.get(i);
            int len = msg.getContent() != null ? msg.getContent().length() : 0;
            if (currentChars + len > maxChars && !retained.isEmpty()) {
                break;
            }
            retained.add(msg);
            currentChars += len;
        }

        Collections.reverse(retained);
        return retained;
    }
}
