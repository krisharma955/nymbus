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
        if (org.springframework.util.StringUtils.hasText(contextualQuery)) {
            try {
                webResults = webSearchTool.search(contextualQuery, chatProperties.getMaxSearchResults());
            } catch (Exception e) {
                log.warn("Web search failed for query '{}': {}. Proceeding without fresh web results.", contextualQuery, e.getMessage());
                webSearchFailed = true;
            }
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

        String cleaned = sanitizeSearchQuery(currentMessage);
        if (history == null || history.isEmpty()) {
            return cleaned;
        }

        // Only expand if there is clear evidence of being a follow-up question
        // Never rely on length alone. Ambiguous queries remain standalone.
        if (isFollowUpQuestion(cleaned)) {
            String subject = extractRelevantSubject(history, cleaned);
            if (subject != null && !subject.isBlank()) {
                // If cleaned query already explicitly mentions the subject, don't duplicate
                if (cleaned.toLowerCase(Locale.ROOT).contains(subject.toLowerCase(Locale.ROOT))) {
                    return cleaned;
                }
                String combined = subject + " " + cleaned;
                return sanitizeSearchQuery(combined);
            }
        }

        return cleaned;
    }

    public boolean isFollowUpQuestion(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }

        String trimmed = text.trim();
        String lower = trimmed.toLowerCase(Locale.ROOT);

        // Pattern 1: Starts with elliptical follow-up starters
        if (lower.matches("^(why\\??|how so\\??|why so\\??|and\\??|so\\??|tell me more\\.?|elaborate\\.?|continue\\.?|explain more\\.?).*")
                || lower.startsWith("what about")
                || lower.startsWith("how about")
                || lower.startsWith("can you elaborate")
                || lower.startsWith("can you explain more")) {
            return true;
        }

        // Pattern 2: Comparative queries without the primary subject (e.g., "compare it with MySQL", "compare with...", "versus...")
        if (lower.matches("^(compare|how does (it|this|that) compare|versus|vs\\.?)\\b.*")) {
            return true;
        }

        // Pattern 3: Reference pronouns referring to prior context (it, its, they, them, their)
        // e.g., "How does it work?", "What about its performance?", "Are they reliable?"
        if (lower.matches(".*\\b(it|its|they|them|their)\\b.*")) {
            return true;
        }

        // Pattern 4: Demonstratives (this, that, these, those) used as referential pronouns
        // e.g., "How does that work?", "Tell me about that", "Can you explain this?"
        if (lower.matches(".*\\b(how does (that|this) work|explain (that|this)|about (that|this|these|those)|with (that|this)|is (that|this) true|what does (that|this) mean)\\b.*")
                || lower.matches("^(why is (that|this)|what is (that|this)|how is (that|this)).*")) {
            return true;
        }

        // Pattern 5: Positional / ordinal references to previous answers
        if (lower.matches(".*\\b(the first (one|point|aspect)?|the second (one|point|aspect)?|the third (one|point|aspect)?|the latter|the former|previous one|earlier point|mentioned above)\\b.*")) {
            return true;
        }

        return false;
    }

    private String extractRelevantSubject(List<ConversationMessage> history, String currentQuery) {
        if (history == null || history.isEmpty()) {
            return null;
        }

        // Search backwards through history
        for (int i = history.size() - 1; i >= 0; i--) {
            ConversationMessage msg = history.get(i);
            if (msg.getContent() == null || msg.getContent().isBlank()) {
                continue;
            }

            String content = msg.getContent().trim();
            if (content.equalsIgnoreCase(currentQuery)) {
                continue;
            }

            if (msg.getRole() == MessageRole.USER) {
                String subject = cleanSubject(content);
                if (subject != null && !subject.isBlank()) {
                    return subject;
                }
            } else if (msg.getRole() == MessageRole.ASSISTANT) {
                // If the immediately prior message is an assistant answer, extract topic entity
                String subject = extractTopicFromAssistantMessage(content);
                if (subject != null && !subject.isBlank()) {
                    return subject;
                }
            }
        }

        return null;
    }

    private String cleanSubject(String userMessage) {
        if (userMessage == null || userMessage.isBlank()) {
            return null;
        }

        String cleaned = userMessage.trim();
        // Remove common question prefixes to get to the core topic
        cleaned = cleaned.replaceAll("(?i)^(please\\s+)?(tell me about|give me a short synopsis on|give me an overview of|analyze|summarize|explain|what is|what are|what was|describe|search for)\\s+", "");
        cleaned = cleaned.replaceAll("[?.!]+$", "").trim();

        if (cleaned.length() > 60) {
            int commaIdx = cleaned.indexOf(',');
            if (commaIdx > 10 && commaIdx < 60) {
                cleaned = cleaned.substring(0, commaIdx).trim();
            } else {
                cleaned = cleaned.substring(0, 60).trim();
            }
        }

        return sanitizeSearchQuery(cleaned);
    }

    private String extractTopicFromAssistantMessage(String assistantContent) {
        if (assistantContent == null || assistantContent.isBlank()) {
            return null;
        }

        String firstLine = assistantContent.lines().findFirst().orElse("").trim();
        firstLine = firstLine.replaceAll("^#+\\s*", ""); // remove markdown headers
        firstLine = firstLine.replaceAll("[*`_]", ""); // remove markdown styling

        // If line is like "PostgreSQL is an open source...", extract leading subject
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("^([A-Z][a-zA-Z0-9.+#\\s]{1,30})\\s+(is|are|provides|was|has|can)\\b").matcher(firstLine);
        if (m.find()) {
            return m.group(1).trim();
        }

        String[] words = firstLine.split("\\s+");
        if (words.length > 0 && words[0].length() > 2) {
            int take = Math.min(words.length, 3);
            return String.join(" ", Arrays.copyOfRange(words, 0, take)).replaceAll("[^a-zA-Z0-9.+# -]", "").trim();
        }

        return null;
    }

    public String sanitizeSearchQuery(String query) {
        if (query == null || query.isBlank()) {
            return "";
        }

        // 1. Remove control characters & normalize linebreaks
        String sanitized = query.replaceAll("[\\p{Cntrl}\\r\\n\\t]+", " ");

        // 2. Trim markdown formatting artifacts (headers, bullet symbols, bold/italic, backticks)
        sanitized = sanitized.replaceAll("[#*`_]+", "");

        // 3. Normalize multiple whitespace
        sanitized = sanitized.replaceAll("\\s+", " ").trim();

        // 4. Remove leading/trailing quotation marks if unmatched
        if (sanitized.startsWith("\"") && !sanitized.endsWith("\"")) {
            sanitized = sanitized.substring(1).trim();
        }
        if (sanitized.endsWith("\"") && !sanitized.startsWith("\"")) {
            sanitized = sanitized.substring(0, sanitized.length() - 1).trim();
        }

        // 5. Enforce reasonable maximum query length
        if (sanitized.length() > 250) {
            int lastSpace = sanitized.lastIndexOf(' ', 250);
            if (lastSpace > 100) {
                sanitized = sanitized.substring(0, lastSpace).trim();
            } else {
                sanitized = sanitized.substring(0, 250).trim();
            }
        }

        return sanitized;
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
