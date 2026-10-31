package com.graviton.nymbus.agent.dto;

public record ReportOutput(
        String title,
        String executiveSummary,
        String contentMarkdown
) {}
