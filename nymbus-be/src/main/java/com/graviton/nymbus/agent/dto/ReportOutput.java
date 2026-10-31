package com.graviton.nymbus.agent.dto;

import java.util.List;

public record ReportOutput(
        String title,
        String executiveSummary,
        String contentMarkdown,
        List<ReportSectionOutput> sections
) {
    public ReportOutput(String title, String executiveSummary, String contentMarkdown) {
        this(title, executiveSummary, contentMarkdown, List.of());
    }
}
