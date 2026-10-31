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
        return executeResearchWithAudit(subTaskTitle, subTaskDescription, overallPrompt, List.of());
    }

    public ResearchExecutionResult executeResearchWithAudit(
            String subTaskTitle,
            String subTaskDescription,
            String overallPrompt,
            List<SearchResult> additionalSources) {

        log.info("ResearchAgent starting research on: '{}' with {} private document sources",
                subTaskTitle, additionalSources != null ? additionalSources.size() : 0);

        List<String> queries = List.of(subTaskTitle);
        long searchStart = System.currentTimeMillis();
        List<SearchResult> webResults = webSearchTool.search(subTaskTitle, 4);
        long searchDuration = System.currentTimeMillis() - searchStart;

        List<SearchResult> combinedResults = new ArrayList<>();
        if (additionalSources != null) {
            combinedResults.addAll(additionalSources);
        }
        if (webResults != null) {
            combinedResults.addAll(webResults);
        }

        ResearchOutput output;
        try {
            String systemPrompt = """
                    You are the Senior Research Specialist and Evidence Extraction Agent in the Nymbus Autonomous Research Platform.
                    Your objective is to conduct an exhaustive, deeply informative factual investigation across all provided search results and internal document passages for a designated subtask.
                    
                    INVESTIGATION & EVIDENCE EXTRACTION MANDATES:
                    1. Exhaustive Depth: Do not produce cursory or surface-level summaries. Extract ALL salient facts, quantitative statistics, benchmark numbers, dates, technical mechanisms, and qualitative insights present in the provided snippets.
                    2. In-Depth Subtask Synthesis: The "summary" field must provide an extensive, highly detailed, multi-paragraph synthesis. Thoroughly explain the background, key discoveries, analytical context, and implications discovered in the subtask evidence.
                    3. Rigorous Atomic Fact Formulation: For each item in "findings":
                       - "fact": A detailed, complete, highly informative factual statement articulating the exact discovery, metric, or empirical relationship.
                       - "sourceUrl": The exact URL or document chunk URI ("doc://...") where this finding was retrieved.
                       - "sourceTitle": The exact title of the source.
                       - "excerpt": CRITICAL REQUIREMENT: This MUST be an EXACT, VERBATIM substring copied directly from the snippet text in the Search Results or Document Passages. Do NOT paraphrase, summarize, or alter a single word or punctuation mark, as it is validated programmatically by automated verbatim verification engines.
                    4. Query Diversity: Provide the search queries employed to guide deeper exploration.
                    
                    Return ONLY a JSON object conforming strictly to:
                    {
                      "summary": "Extensive, highly detailed, multi-paragraph synthesis of subtask findings...",
                      "findings": [
                        {
                          "fact": "Comprehensive, highly informative factual statement...",
                          "sourceUrl": "...",
                          "sourceTitle": "...",
                          "excerpt": "Exact verbatim quote copied directly from the snippet text without any alteration"
                        }
                      ],
                      "searchQueries": ["..."]
                    }
                    """;

            StringBuilder userMessage = new StringBuilder();
            userMessage.append("SubTask: ").append(subTaskTitle).append("\n");
            userMessage.append("Objective: ").append(subTaskDescription).append("\n\n");
            userMessage.append("Search Results & Document Passages:\n");
            for (SearchResult r : combinedResults) {
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
                return new ResearchExecutionResult(output, combinedResults, searchDuration);
            }
        } catch (Exception e) {
            log.warn("LLM call failed in ResearchAgent: {}. Generating structured synthesis from results.", e.getMessage());
        }

        output = createFallbackOutput(subTaskTitle, combinedResults, queries);
        return new ResearchExecutionResult(output, combinedResults, searchDuration);
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
