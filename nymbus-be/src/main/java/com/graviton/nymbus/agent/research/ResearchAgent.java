package com.graviton.nymbus.agent.research;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.graviton.nymbus.agent.dto.ResearchFindingDto;
import com.graviton.nymbus.agent.dto.ResearchOutput;
import com.graviton.nymbus.tool.WebSearchTool;
import com.graviton.nymbus.tool.model.SearchResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ResearchAgent {

    private final ChatClient chatClient;
    private final WebSearchTool webSearchTool;
    private final ObjectMapper objectMapper;

    public record ResearchExecutionResult(
            ResearchOutput output,
            List<SearchResult> searchResults,
            long searchDurationMs
    ) {}

    public ResearchExecutionResult executeResearchWithAudit(String subTaskTitle, String subTaskDescription, String overallPrompt) {
        log.info("ResearchAgent starting research on: '{}'", subTaskTitle);

        List<String> queries = List.of(subTaskTitle);
        long searchStart = System.currentTimeMillis();
        List<SearchResult> searchResults = webSearchTool.search(subTaskTitle, 4);
        long searchDuration = System.currentTimeMillis() - searchStart;

        ResearchOutput output;
        try {
            String systemPrompt = """
                    You are the Research Agent in the Nymbus Research Platform.
                    Your role is to investigate external search results for a specific subtask, extract verified facts with exact verbatim excerpts and source URLs, and summarize the key findings.

                    CRITICAL REQUIREMENT: For each finding, the "excerpt" field MUST be copied VERBATIM from the snippet in the Search Results. Never paraphrase or fabricate the excerpt, as it will be rejected by automated programmatic verification.

                    Return ONLY a JSON object conforming to:
                    {
                      "summary": "Concise paragraph synthesizing the subtask research",
                      "findings": [
                        {
                          "fact": "Atomic fact statement",
                          "sourceUrl": "...",
                          "sourceTitle": "...",
                          "excerpt": "Verbatim quote copied directly from the snippet"
                        }
                      ],
                      "searchQueries": ["..."]
                    }
                    """;

            StringBuilder userMessage = new StringBuilder();
            userMessage.append("SubTask: ").append(subTaskTitle).append("\n");
            userMessage.append("Objective: ").append(subTaskDescription).append("\n\n");
            userMessage.append("Search Results:\n");
            for (SearchResult r : searchResults) {
                userMessage.append("- Title: ").append(r.title()).append("\n");
                userMessage.append("  URL: ").append(r.url()).append("\n");
                userMessage.append("  Snippet: ").append(r.content()).append("\n\n");
            }

            String responseContent = chatClient.prompt()
                    .system(systemPrompt)
                    .user(userMessage.toString())
                    .call()
                    .content();

            if (responseContent != null && !responseContent.isBlank()) {
                String cleanJson = extractJson(responseContent);
                output = objectMapper.readValue(cleanJson, ResearchOutput.class);
                return new ResearchExecutionResult(output, searchResults, searchDuration);
            }
        } catch (Exception e) {
            log.warn("LLM call failed in ResearchAgent: {}. Generating structured synthesis from search results.", e.getMessage());
        }

        output = createFallbackOutput(subTaskTitle, searchResults, queries);
        return new ResearchExecutionResult(output, searchResults, searchDuration);
    }

    public ResearchOutput executeResearch(String subTaskTitle, String subTaskDescription, String overallPrompt) {
        return executeResearchWithAudit(subTaskTitle, subTaskDescription, overallPrompt).output();
    }

    private ResearchOutput createFallbackOutput(String title, List<SearchResult> results, List<String> queries) {
        List<ResearchFindingDto> findings = new ArrayList<>();
        StringBuilder summary = new StringBuilder("Completed investigation on '" + title + "'. Gathered evidence shows: ");

        for (int i = 0; i < results.size(); i++) {
            SearchResult r = results.get(i);
            findings.add(new ResearchFindingDto(
                    r.title() + ": " + r.content(),
                    r.url(),
                    r.title(),
                    r.content()
            ));
            if (i > 0) summary.append("; ");
            summary.append(r.title());
        }
        summary.append(".");

        return new ResearchOutput(summary.toString(), findings, queries);
    }

    private String extractJson(String text) {
        String trimmed = text.trim();
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        return trimmed.trim();
    }
}
