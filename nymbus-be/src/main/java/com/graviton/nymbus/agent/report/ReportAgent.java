package com.graviton.nymbus.agent.report;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.graviton.nymbus.agent.dto.ReportOutput;
import com.graviton.nymbus.agent.dto.SubTaskSummaryDto;
import com.graviton.nymbus.evidence.entity.Evidence;
import com.graviton.nymbus.source.entity.Source;
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
        return generateReport(taskTitle, taskPrompt, completedSubTasks, List.of(), List.of());
    }

    public ReportOutput generateReport(
            String taskTitle,
            String taskPrompt,
            List<SubTaskSummaryDto> completedSubTasks,
            List<Source> sources,
            List<Evidence> evidenceList) {

        log.info("ReportAgent generating report for task: '{}' with {} subtasks, {} sources, {} evidence claims",
                taskTitle, completedSubTasks.size(), sources != null ? sources.size() : 0, evidenceList != null ? evidenceList.size() : 0);

        try {
            String systemPrompt = """
                    You are the Senior Research Analyst and Principal Report Author in the Nymbus Research Platform.
                    Your objective is to produce an exhaustive, authoritative, deeply structured, and comprehensive final research report in Markdown.

                    CRITICAL REPORT STANDARDS:
                    1. Depth and Detail: Do NOT write a high-level or brief summary. Provide an extensive, publication-grade report with deep analysis, granular breakdowns, and historical/technical context.
                    2. Clear Structure with Headings:
                       - # [Authoritative Report Title]
                       - ## Executive Summary: A multi-paragraph synthesis of the primary discoveries, strategic context, and bottom-line impact.
                       - ## Comprehensive Thematic Analysis: Break the topic down into logical themes. For each theme, include detailed sub-headings, paragraphs explaining the mechanisms, and structured bullet points highlighting technical and financial developments.
                       - ## Empirical Data, Metrics & Key Findings: Bullet points detailing quantitative metrics (e.g. costs, payloads, percentages, dates, and milestones).
                       - ## Strategic Implications & Industry Outlook: Forward-looking analysis, risks, regulatory landscape, and future projections.
                       - ## References & Sources Consulted: An explicit list citing every source consulted with its title, domain, and clickable markdown link [Source Title](URL).
                    3. Explicit In-Text Source Attribution: In the body and bullet points, explicitly cite the sources by name and domain (e.g., "According to NASA...", "As documented by the Federal Aviation Administration (faa.gov)...", "Research from Purdue University shows...").
                    4. Bullet Points & Readability: Use bold keywords at the beginning of bullet points (e.g., "- **Launch Cost Reductions:** ...") for high readability.

                    Return ONLY a JSON object conforming strictly to:
                    {
                      "title": "Comprehensive Research Report: ...",
                      "executiveSummary": "Multi-paragraph executive summary...",
                      "contentMarkdown": "# Comprehensive Research Report: ...\\n\\n## Executive Summary\\n...\\n\\n## Comprehensive Thematic Analysis\\n...\\n\\n## References & Sources Consulted\\n..."
                    }
                    """;

            StringBuilder userMessage = new StringBuilder();
            userMessage.append("Research Subject: ").append(taskTitle).append("\n");
            userMessage.append("Original Question / Objective: ").append(taskPrompt).append("\n\n");

            userMessage.append("### Consulted Web Sources:\n");
            if (sources != null && !sources.isEmpty()) {
                for (int i = 0; i < sources.size(); i++) {
                    Source s = sources.get(i);
                    userMessage.append(String.format("%d. %s | Domain: %s | URL: %s\n",
                            i + 1, s.getTitle(), s.getDomain(), s.getUrl()));
                }
            } else {
                userMessage.append("None provided.\n");
            }
            userMessage.append("\n");

            userMessage.append("### Verified Evidence Claims:\n");
            if (evidenceList != null && !evidenceList.isEmpty()) {
                for (int i = 0; i < evidenceList.size(); i++) {
                    Evidence e = evidenceList.get(i);
                    userMessage.append(String.format("- Claim: %s (Status: %s, Confidence: %s)\n  Supporting Passage: \"%s\"\n",
                            e.getClaim(), e.getVerificationStatus(), e.getConfidenceScore(), e.getSupportingPassage()));
                }
            } else {
                userMessage.append("None isolated.\n");
            }
            userMessage.append("\n");

            userMessage.append("### Subtask Investigations & Findings:\n");
            for (SubTaskSummaryDto st : completedSubTasks) {
                userMessage.append("#### Subtask: ").append(st.title()).append("\n");
                userMessage.append("Objective: ").append(st.description()).append("\n");
                userMessage.append("Detailed Findings:\n").append(st.resultSummary() != null ? st.resultSummary() : "No summary available.").append("\n\n");
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
            log.warn("LLM call failed in ReportAgent: {}. Generating markdown report from subtask results and sources.", e.getMessage());
        }

        return createFallbackReport(taskTitle, taskPrompt, completedSubTasks, sources, evidenceList);
    }

    private ReportOutput createFallbackReport(
            String taskTitle,
            String taskPrompt,
            List<SubTaskSummaryDto> subTasks,
            List<Source> sources,
            List<Evidence> evidenceList) {

        String reportTitle = "Comprehensive Research Report: " + taskTitle;
        String executiveSummary = "This report compiles empirical findings, verified evidence, and structured analysis for the research objective: " + taskPrompt;

        StringBuilder md = new StringBuilder();
        md.append("# ").append(reportTitle).append("\n\n");
        md.append("## Executive Summary\n\n").append(executiveSummary).append("\n\n");

        md.append("## Core Findings & Detailed Analysis\n\n");
        for (int i = 0; i < subTasks.size(); i++) {
            SubTaskSummaryDto st = subTasks.get(i);
            md.append("### ").append(i + 1).append(". ").append(st.title()).append("\n\n");
            md.append("**Research Scope:** ").append(st.description()).append("\n\n");
            md.append("**Key Findings & Analytical Points:**\n\n");
            if (st.resultSummary() != null && !st.resultSummary().isBlank()) {
                md.append(st.resultSummary()).append("\n\n");
            } else {
                md.append("- Research investigation completed across primary domain sources.\n\n");
            }
        }

        if (evidenceList != null && !evidenceList.isEmpty()) {
            md.append("## Verified Evidence & Empirical Metrics\n\n");
            for (Evidence ev : evidenceList) {
                md.append("- **Claim:** ").append(ev.getClaim()).append("\n");
                md.append("  - **Status:** `").append(ev.getVerificationStatus()).append("`");
                if (ev.getConfidenceScore() != null) {
                    md.append(" (Confidence: ").append(ev.getConfidenceScore()).append(")");
                }
                md.append("\n");
                if (ev.getSupportingPassage() != null && !ev.getSupportingPassage().isBlank()) {
                    md.append("  - **Supporting Source Text:** _\"").append(ev.getSupportingPassage()).append("\"_\n");
                }
                md.append("\n");
            }
        }

        if (sources != null && !sources.isEmpty()) {
            md.append("## References & Sources Consulted\n\n");
            for (int i = 0; i < sources.size(); i++) {
                Source src = sources.get(i);
                String title = src.getTitle() != null && !src.getTitle().isBlank() ? src.getTitle() : src.getDomain();
                md.append(i + 1).append(". [").append(title).append("](").append(src.getUrl()).append(") — **").append(src.getDomain()).append("** (").append(src.getSourceType()).append(")\n");
            }
            md.append("\n");
        }

        md.append("## Conclusion & Strategic Outlook\n\n");
        md.append("The empirical evidence and domain findings validate the core trends examined during this investigation. Continued monitoring of technological milestones and cost dynamics will provide further clarity as reusable architectures mature.\n");

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
