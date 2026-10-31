package com.graviton.nymbus.conversation.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.graviton.nymbus.conversation.dto.ChatAgentResponse;
import com.graviton.nymbus.conversation.dto.CitationDto;
import com.graviton.nymbus.conversation.dto.ReportReferenceDto;
import com.graviton.nymbus.conversation.entity.ConversationMessage;
import com.graviton.nymbus.document.entity.DocumentChunk;
import com.graviton.nymbus.tool.model.SearchResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class ChatAgent {

    private final ChatClient chatClient;
    private final ObjectMapper objectMapper;

    public ChatAgentResponse generateAnswer(
            String currentQuestion,
            String conversationSummary,
            List<ConversationMessage> recentHistory,
            List<SearchResult> webResults,
            List<DocumentChunk> documentChunks,
            List<ReportReferenceDto> previousReports,
            boolean webSearchFailed
    ) {
        log.info("ChatAgent generating answer for question: '{}'", currentQuestion);

        // Build source lookup maps
        Map<String, CitationDto> availableCitations = new LinkedHashMap<>();

        StringBuilder promptBuilder = new StringBuilder();

        // 1. Conversation Summary
        if (conversationSummary != null && !conversationSummary.isBlank()) {
            promptBuilder.append("### Conversation Memory Summary (Context Only):\n")
                    .append(conversationSummary.trim()).append("\n\n");
        }

        // 2. Recent Chat History
        if (recentHistory != null && !recentHistory.isEmpty()) {
            promptBuilder.append("### Recent Conversation History (Context Only - Not Verified Factual Evidence):\n");
            for (ConversationMessage msg : recentHistory) {
                promptBuilder.append(msg.getRole()).append(": ").append(msg.getContent()).append("\n");
            }
            promptBuilder.append("\n");
        }

        // 3. Previous Research Reports
        if (previousReports != null && !previousReports.isEmpty()) {
            promptBuilder.append("### Previous Deep Research Reports Generated in this Conversation:\n");
            for (ReportReferenceDto rep : previousReports) {
                promptBuilder.append("- Report: '").append(rep.title()).append("' (Task: ").append(rep.taskId()).append(")\n");
                if (rep.executiveSummary() != null && !rep.executiveSummary().isBlank()) {
                    promptBuilder.append("  Summary: ").append(rep.executiveSummary()).append("\n");
                }
            }
            promptBuilder.append("\n");
        }

        // 4. Web Search Evidence
        promptBuilder.append("### Fresh Web Search Evidence:\n");
        if (webSearchFailed) {
            promptBuilder.append("[NOTICE: Live web search was unavailable for this query. Inform the user accordingly.]\n\n");
        } else if (webResults != null && !webResults.isEmpty()) {
            for (int i = 0; i < webResults.size(); i++) {
                SearchResult r = webResults.get(i);
                String refId = "W" + (i + 1);
                promptBuilder.append(String.format("[%s] Title: %s | URL: %s\n    Content: %s\n\n",
                        refId, r.title(), r.url(), r.content()));

                availableCitations.put(refId, new CitationDto(
                        refId,
                        "WEB",
                        r.title(),
                        r.url(),
                        null,
                        null,
                        r.content()
                ));
            }
        } else {
            promptBuilder.append("No relevant web search results found.\n\n");
        }

        // 5. Document Passages Evidence
        promptBuilder.append("### Attached Document Passages Evidence:\n");
        if (documentChunks != null && !documentChunks.isEmpty()) {
            for (int i = 0; i < documentChunks.size(); i++) {
                DocumentChunk chunk = documentChunks.get(i);
                String refId = "D" + (i + 1);
                String docName = chunk.getDocument() != null && chunk.getDocument().getFileName() != null
                        ? chunk.getDocument().getFileName() : "Document";
                int page = chunk.getPageNumber() != null ? chunk.getPageNumber() : 1;
                String docUrl = chunk.getDocument() != null
                        ? "doc://" + chunk.getDocument().getId() + "/chunks/" + chunk.getId() : "";

                promptBuilder.append(String.format("[%s] File: %s (Page %d) | URI: %s\n    Excerpt: %s\n\n",
                        refId, docName, page, docUrl, chunk.getContent()));

                availableCitations.put(refId, new CitationDto(
                        refId,
                        "DOCUMENT",
                        docName + " (Page " + page + ")",
                        docUrl,
                        chunk.getDocument() != null ? chunk.getDocument().getId() : null,
                        chunk.getId(),
                        chunk.getContent()
                ));
            }
        } else {
            promptBuilder.append("No document passages attached or retrieved.\n\n");
        }

        promptBuilder.append("### User Question:\n").append(currentQuestion);

        String systemPrompt = """
                You are the Conversational AI Research Assistant in the Nymbus Platform.
                Your role is to provide thorough, articulate, well-grounded, and context-aware responses to user queries.

                CORE INSTRUCTIONS:
                1. Answer the current question directly and comprehensively using provided evidence and conversational context.
                2. Prioritize fresh web search evidence and document passages for factual assertions. Never treat prior conversation history as verified external fact.
                3. Ground your statements with explicit in-text citations like [W1], [W2] for web evidence and [D1], [D2] for document passages.
                4. Distinguish clearly between live web findings and document contents.
                5. If live web search failed, state clearly that fresh external verification was unavailable.
                6. If the question requires multi-faceted, exhaustive investigation, provide an immediate answer and advise the user that deep research can be triggered.
                7. Never invent or hallucinate source URLs or citations.

                Return ONLY a JSON object conforming strictly to:
                {
                  "answerMarkdown": "Your detailed Markdown response with embedded citations like [W1], [D1]...",
                  "citedReferenceIds": ["W1", "D1"]
                }
                """;

        try {
            String response = chatClient.prompt()
                    .system(systemPrompt)
                    .user(promptBuilder.toString())
                    .call()
                    .content();

            if (response != null && !response.isBlank()) {
                String cleanJson = extractJson(response);
                ChatAgentJsonDto resultDto = objectMapper.readValue(cleanJson, ChatAgentJsonDto.class);

                List<CitationDto> resolvedCitations = new ArrayList<>();
                if (resultDto.citedReferenceIds() != null) {
                    for (String refId : resultDto.citedReferenceIds()) {
                        CitationDto c = availableCitations.get(refId.trim());
                        if (c != null && !resolvedCitations.contains(c)) {
                            resolvedCitations.add(c);
                        }
                    }
                }

                // If model cited references inside markdown text that weren't in array, auto-resolve them
                for (Map.Entry<String, CitationDto> entry : availableCitations.entrySet()) {
                    if (resultDto.answerMarkdown() != null && resultDto.answerMarkdown().contains("[" + entry.getKey() + "]")) {
                        if (!resolvedCitations.contains(entry.getValue())) {
                            resolvedCitations.add(entry.getValue());
                        }
                    }
                }

                return new ChatAgentResponse(resultDto.answerMarkdown(), resolvedCitations);
            }
        } catch (Exception e) {
            log.warn("ChatAgent LLM call failed: {}. Falling back to deterministic contextual response.", e.getMessage());
        }

        // Fallback
        String fallbackAnswer = generateFallbackAnswer(currentQuestion, webResults, documentChunks, webSearchFailed);
        return new ChatAgentResponse(fallbackAnswer, new ArrayList<>(availableCitations.values()));
    }

    private String generateFallbackAnswer(
            String question,
            List<SearchResult> webResults,
            List<DocumentChunk> docs,
            boolean webSearchFailed
    ) {
        StringBuilder sb = new StringBuilder();
        sb.append("Here is the relevant information gathered regarding your inquiry: **").append(question).append("**\n\n");

        if (webSearchFailed) {
            sb.append("> ⚠️ *Notice: Live web search was temporarily unavailable during this request.*\n\n");
        } else if (webResults != null && !webResults.isEmpty()) {
            sb.append("### Web Findings\n");
            for (int i = 0; i < webResults.size(); i++) {
                SearchResult sr = webResults.get(i);
                sb.append("- **").append(sr.title()).append("** [W").append(i + 1).append("]: ")
                        .append(sr.content()).append("\n");
            }
            sb.append("\n");
        }

        if (docs != null && !docs.isEmpty()) {
            sb.append("### Document Evidence\n");
            for (int i = 0; i < docs.size(); i++) {
                DocumentChunk dc = docs.get(i);
                String docName = dc.getDocument() != null ? dc.getDocument().getFileName() : "Document";
                sb.append("- **").append(docName).append("** (Page ").append(dc.getPageNumber() != null ? dc.getPageNumber() : 1)
                        .append(") [D").append(i + 1).append("]: ").append(dc.getContent()).append("\n");
            }
        }

        return sb.toString();
    }

    private String extractJson(String raw) {
        String trimmed = raw.trim();
        int firstBrace = trimmed.indexOf('{');
        int lastBrace = trimmed.lastIndexOf('}');
        if (firstBrace != -1 && lastBrace > firstBrace) {
            return trimmed.substring(firstBrace, lastBrace + 1);
        }
        return trimmed;
    }

    private record ChatAgentJsonDto(
            String answerMarkdown,
            List<String> citedReferenceIds
    ) {}
}
