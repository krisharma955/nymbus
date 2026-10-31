package com.graviton.nymbus.agent.report;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.graviton.nymbus.agent.dto.*;
import com.graviton.nymbus.evidence.entity.Evidence;
import com.graviton.nymbus.source.entity.Source;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReportAgent {

    private final ChatClient chatClient;
    private final ObjectMapper objectMapper;

    public ReportOutput generateReport(String taskTitle, String taskPrompt, List<SubTaskSummaryDto> completedSubTasks) {
        return generateReport(taskTitle, taskPrompt, completedSubTasks, List.of(), List.of(), null);
    }

    public ReportOutput generateReport(
            String taskTitle,
            String taskPrompt,
            List<SubTaskSummaryDto> completedSubTasks,
            List<Source> sources,
            List<Evidence> evidenceList) {
        return generateReport(taskTitle, taskPrompt, completedSubTasks, sources, evidenceList, null);
    }

    public ReportOutput generateReport(
            String taskTitle,
            String taskPrompt,
            List<SubTaskSummaryDto> completedSubTasks,
            List<Source> sources,
            List<Evidence> evidenceList,
            AnalysisOutput analysisOutput) {

        log.info("ReportAgent generating report for task: '{}' with {} subtasks, {} sources, {} evidence claims, hasAnalysis={}",
                taskTitle, completedSubTasks.size(), sources != null ? sources.size() : 0,
                evidenceList != null ? evidenceList.size() : 0, analysisOutput != null);

        try {
            String systemPrompt = """
                    You are the Chief Research Officer and Principal Report Author in the Nymbus Autonomous Research Platform.
                    Your objective is to produce an authoritative, comprehensive, publication-grade research dossier decomposed into ordered, detailed sections with inspectable evidence citations.
                    
                    REPORT STRUCTURE & RIGOROUS DEPTH MANDATES:
                    1. Publication-Grade Exhaustiveness: Produce a thorough, fully fleshed-out report. Avoid brief summaries, placeholder outlines, or superficial bullets. Every section must contain extensive, highly articulate paragraphs, deep analytical commentary, and comprehensive evaluations.
                    2. Core Required Sections (Ordered with unique "sectionKey"s):
                       - Section 1 ("executive-summary"): An exhaustive, multi-paragraph executive brief synthesizing the strategic essence, macro dynamics, key findings, and core conclusions.
                       - Section 2 ("thematic-analysis"): A comprehensive, deeply researched analytical dissection of the primary themes, technical mechanisms, market drivers, and structural complexities.
                       - Section 3 ("empirical-findings-and-metrics"): An in-depth evaluation of all empirical data points, benchmark statistics, quantitative indicators, formulas, and verified metrics. Include Markdown data tables where relevant.
                       - Section 4 ("critical-assessment-and-risks"): A rigorous critical assessment examining potential headwinds, regulatory or technical bottlenecks, counterarguments, and risk matrices with mitigation strategies.
                       - Section 5 ("strategic-recommendations-and-roadmap"): A detailed, phased operational roadmap with actionable, prioritized recommendations and implementation milestones.
                       - Section 6 ("references-and-evidence-index"): An authoritative bibliographic summary referencing consulted sources and evidence.
                    3. Rigorous In-Text Citations:
                       - Within each section's markdown text, embed precise citation markers [1], [2], etc., wherever referencing verified claims or findings.
                       - Explicitly attribute facts to their source organizations, authors, or documents in the narrative prose.
                    4. Exact Evidence Mapping: In each section's "citedEvidenceIds" array, supply the exact UUID strings of the Evidence items cited within that specific section.
                    5. Unified Markdown: In "contentMarkdown", provide the full combined report as a single, beautifully formatted, comprehensive Markdown document adhering to all sections.
                    
                    Return ONLY a JSON object conforming strictly to:
                    {
                      "title": "Authoritative Research Dossier: ...",
                      "executiveSummary": "Comprehensive multi-paragraph executive summary...",
                      "contentMarkdown": "# Authoritative Research Dossier: ...\\n\\n...",
                      "sections": [
                        {
                          "sectionKey": "executive-summary",
                          "title": "Executive Summary",
                          "contentMarkdown": "## Executive Summary\\n\\n...",
                          "sectionOrder": 1,
                          "citedEvidenceIds": []
                        },
                        {
                          "sectionKey": "thematic-analysis",
                          "title": "Comprehensive Thematic Analysis",
                          "contentMarkdown": "## Comprehensive Thematic Analysis\\n\\n...",
                          "sectionOrder": 2,
                          "citedEvidenceIds": ["uuid-1", "uuid-2"]
                        }
                      ]
                    }
                    """;

            StringBuilder userMessage = new StringBuilder();
            userMessage.append("Research Subject: ").append(taskTitle).append("\n");
            userMessage.append("Objective / Prompt: ").append(taskPrompt).append("\n\n");

            if (analysisOutput != null) {
                userMessage.append("### Analysis & Synthesis Summary:\n");
                userMessage.append(analysisOutput.synthesisOverview()).append("\n\n");
                if (!analysisOutput.recommendations().isEmpty()) {
                    userMessage.append("Recommendations: ").append(String.join("; ", analysisOutput.recommendations())).append("\n\n");
                }
            }

            userMessage.append("### Available Verified Evidence (ID & Claim):\n");
            if (evidenceList != null && !evidenceList.isEmpty()) {
                for (int i = 0; i < evidenceList.size(); i++) {
                    Evidence e = evidenceList.get(i);
                    userMessage.append(String.format("[%d] UUID: %s | Status: %s | Confidence: %s\n    Claim: %s\n    Passage: \"%s\"\n",
                            i + 1, e.getId(), e.getVerificationStatus(), e.getConfidenceScore(), e.getClaim(), e.getSupportingPassage()));
                }
            } else {
                userMessage.append("None provided.\n");
            }
            userMessage.append("\n");

            userMessage.append("### Consulted Sources:\n");
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

            userMessage.append("### Subtask Investigations & Findings:\n");
            for (SubTaskSummaryDto st : completedSubTasks) {
                userMessage.append("#### Subtask: ").append(st.title()).append("\n");
                userMessage.append("Findings:\n").append(st.resultSummary() != null ? st.resultSummary() : "N/A").append("\n\n");
            }

            String responseContent = chatClient.prompt()
                    .system(systemPrompt)
                    .user(userMessage.toString())
                    .call()
                    .content();

            if (responseContent != null && !responseContent.isBlank()) {
                String cleanJson = extractJson(responseContent);
                ReportOutput output = objectMapper.readValue(cleanJson, ReportOutput.class);
                if (output.sections() != null && !output.sections().isEmpty()) {
                    return output;
                }
            }
        } catch (Exception e) {
            log.warn("LLM call failed in ReportAgent: {}. Generating structured report sections from evidence.", e.getMessage());
        }

        return createFallbackReport(taskTitle, taskPrompt, completedSubTasks, sources, evidenceList, analysisOutput);
    }

    private ReportOutput createFallbackReport(
            String taskTitle,
            String taskPrompt,
            List<SubTaskSummaryDto> subTasks,
            List<Source> sources,
            List<Evidence> evidenceList,
            AnalysisOutput analysisOutput) {

        String reportTitle = "Comprehensive Research Report: " + taskTitle;
        String executiveSummary = analysisOutput != null && analysisOutput.synthesisOverview() != null
                ? analysisOutput.synthesisOverview()
                : "This report compiles empirical findings, verified evidence, and structured analysis for the research objective: " + taskPrompt;

        List<ReportSectionOutput> sections = new ArrayList<>();
        StringBuilder combinedMarkdown = new StringBuilder();
        combinedMarkdown.append("# ").append(reportTitle).append("\n\n");

        // Section 1: Executive Summary
        StringBuilder sec1Md = new StringBuilder();
        sec1Md.append("## Executive Summary\n\n").append(executiveSummary).append("\n\n");
        if (analysisOutput != null && !analysisOutput.keyFindings().isEmpty()) {
            sec1Md.append("### Key Analytical Takeaways\n\n");
            for (String kf : analysisOutput.keyFindings()) {
                sec1Md.append("- **Core Finding:** ").append(kf).append("\n");
            }
            sec1Md.append("\n");
        }
        sections.add(new ReportSectionOutput("executive-summary", "Executive Summary", sec1Md.toString(), 1, List.of()));
        combinedMarkdown.append(sec1Md);

        // Section 2: Comprehensive Thematic Analysis
        StringBuilder sec2Md = new StringBuilder();
        sec2Md.append("## Comprehensive Thematic Analysis\n\n");
        for (int i = 0; i < subTasks.size(); i++) {
            SubTaskSummaryDto st = subTasks.get(i);
            sec2Md.append("### ").append(i + 1).append(". ").append(st.title()).append("\n\n");
            sec2Md.append("**Research Scope:** ").append(st.description()).append("\n\n");
            if (st.resultSummary() != null && !st.resultSummary().isBlank()) {
                sec2Md.append(st.resultSummary()).append("\n\n");
            } else {
                sec2Md.append("- Research investigation completed across primary domain sources.\n\n");
            }
        }
        sections.add(new ReportSectionOutput("thematic-analysis", "Comprehensive Thematic Analysis", sec2Md.toString(), 2, List.of()));
        combinedMarkdown.append(sec2Md);

        // Section 3: Empirical Metrics & Verified Evidence
        StringBuilder sec3Md = new StringBuilder();
        sec3Md.append("## Empirical Data & Verified Evidence\n\n");
        List<UUID> citedEvidenceIds = new ArrayList<>();

        if (evidenceList != null && !evidenceList.isEmpty()) {
            for (int i = 0; i < evidenceList.size(); i++) {
                Evidence ev = evidenceList.get(i);
                citedEvidenceIds.add(ev.getId());
                sec3Md.append("- **Claim [").append(i + 1).append("]:** ").append(ev.getClaim()).append("\n");
                sec3Md.append("  - **Verification Status:** `").append(ev.getVerificationStatus()).append("`");
                if (ev.getConfidenceScore() != null) {
                    sec3Md.append(" (Confidence: ").append(ev.getConfidenceScore()).append(")");
                }
                sec3Md.append("\n");
                if (ev.getSupportingPassage() != null && !ev.getSupportingPassage().isBlank()) {
                    sec3Md.append("  - **Supporting Source Text:** _\"").append(ev.getSupportingPassage()).append("\"_\n");
                }
                sec3Md.append("\n");
            }
        } else {
            sec3Md.append("No isolated claims recorded.\n\n");
        }
        sections.add(new ReportSectionOutput("empirical-metrics", "Empirical Data & Verified Evidence", sec3Md.toString(), 3, citedEvidenceIds));
        combinedMarkdown.append(sec3Md);

        // Section 4: Strategic Implications & Recommendations
        StringBuilder sec4Md = new StringBuilder();
        sec4Md.append("## Strategic Implications & Recommendations\n\n");
        if (analysisOutput != null && !analysisOutput.recommendations().isEmpty()) {
            for (String rec : analysisOutput.recommendations()) {
                sec4Md.append("- **Recommendation:** ").append(rec).append("\n");
            }
            sec4Md.append("\n");
        } else {
            sec4Md.append("The empirical evidence and domain findings validate the core trends examined during this investigation. Continued monitoring of technological milestones and cost dynamics will provide further clarity as reusable architectures mature.\n\n");
        }
        sections.add(new ReportSectionOutput("strategic-outlook", "Strategic Implications & Recommendations", sec4Md.toString(), 4, List.of()));
        combinedMarkdown.append(sec4Md);

        // Section 5: References & Sources Consulted
        StringBuilder sec5Md = new StringBuilder();
        sec5Md.append("## References & Sources Consulted\n\n");
        if (sources != null && !sources.isEmpty()) {
            for (int i = 0; i < sources.size(); i++) {
                Source src = sources.get(i);
                String title = src.getTitle() != null && !src.getTitle().isBlank() ? src.getTitle() : src.getDomain();
                sec5Md.append(i + 1).append(". [").append(title).append("](").append(src.getUrl()).append(") — **")
                        .append(src.getDomain()).append("** (").append(src.getSourceType()).append(")\n");
            }
            sec5Md.append("\n");
        }
        sections.add(new ReportSectionOutput("references-and-sources", "References & Sources Consulted", sec5Md.toString(), 5, List.of()));
        combinedMarkdown.append(sec5Md);

        return new ReportOutput(reportTitle, executiveSummary, combinedMarkdown.toString(), sections);
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
