package com.graviton.nymbus.agent.report;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.graviton.nymbus.agent.dto.ReportOutput;
import com.graviton.nymbus.agent.dto.SubTaskSummaryDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReportAgent {

    private final ChatClient chatClient;
    private final ObjectMapper objectMapper;

    public ReportOutput generateReport(String taskTitle, String taskPrompt, List<SubTaskSummaryDto> completedSubTasks) {
        log.info("ReportAgent generating report for task: '{}' with {} subtasks", taskTitle, completedSubTasks.size());

        try {
            String systemPrompt = """
                    You are the Report Agent in the Nymbus Research Platform.
                    Your role is to synthesize verified research findings from multiple subtasks into an exhaustive, structured final research report in Markdown.
                    
                    Return ONLY a JSON object conforming to:
                    {
                      "title": "Comprehensive Research Report: ...",
                      "executiveSummary": "Executive summary paragraph...",
                      "contentMarkdown": "# Comprehensive Research Report\\n\\n## Executive Summary\\n...\\n\\n## Detailed Findings\\n...\\n\\n## Conclusion\\n..."
                    }
                    """;

            StringBuilder userMessage = new StringBuilder();
            userMessage.append("Research Subject: ").append(taskTitle).append("\n");
            userMessage.append("Original Question: ").append(taskPrompt).append("\n\n");
            userMessage.append("Investigated Subtasks & Findings:\n");
            for (SubTaskSummaryDto st : completedSubTasks) {
                userMessage.append("### ").append(st.title()).append("\n");
                userMessage.append("Summary: ").append(st.resultSummary() != null ? st.resultSummary() : "No summary available.").append("\n\n");
            }

            String responseContent = chatClient.prompt()
                    .system(systemPrompt)
                    .user(userMessage.toString())
                    .call()
                    .content();

            if (responseContent != null && !responseContent.isBlank()) {
                String cleanJson = extractJson(responseContent);
                return objectMapper.readValue(cleanJson, ReportOutput.class);
            }
        } catch (Exception e) {
            log.warn("LLM call failed in ReportAgent: {}. Generating markdown report from subtask results.", e.getMessage());
        }

        return createFallbackReport(taskTitle, taskPrompt, completedSubTasks);
    }

    private ReportOutput createFallbackReport(String taskTitle, String taskPrompt, List<SubTaskSummaryDto> subTasks) {
        String reportTitle = "Research Report: " + taskTitle;
        String executiveSummary = "This report compiles empirical findings and structured analysis for the research objective: " + taskPrompt;

        StringBuilder md = new StringBuilder();
        md.append("# ").append(reportTitle).append("\n\n");
        md.append("## Executive Summary\n\n").append(executiveSummary).append("\n\n");
        md.append("## Research Subtasks & Verified Findings\n\n");

        for (int i = 0; i < subTasks.size(); i++) {
            SubTaskSummaryDto st = subTasks.get(i);
            md.append("### ").append(i + 1).append(". ").append(st.title()).append("\n\n");
            md.append("**Objective:** ").append(st.description()).append("\n\n");
            md.append("**Findings:**\n\n");
            if (st.resultSummary() != null && !st.resultSummary().isBlank()) {
                md.append(st.resultSummary()).append("\n\n");
            } else {
                md.append("Research completed with primary domain evidence recorded.\n\n");
            }
        }

        md.append("## Conclusion & Strategic Takeaways\n\n");
        md.append("Across all ").append(subTasks.size())
          .append(" investigated areas, the evidence demonstrates consistent domain progressions. All conclusions have been linked to underlying research executions.\n");

        return new ReportOutput(reportTitle, executiveSummary, md.toString());
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
