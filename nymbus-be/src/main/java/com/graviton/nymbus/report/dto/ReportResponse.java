package com.graviton.nymbus.report.dto;

import com.graviton.nymbus.report.entity.ReportStatus;
import com.graviton.nymbus.report.entity.ResearchReport;

import java.time.Instant;
import java.util.UUID;

public record ReportResponse(
        UUID id,
        UUID researchTaskId,
        int version,
        String title,
        String executiveSummary,
        ReportStatus status,
        String contentMarkdown,
        UUID generatedByExecutionId,
        Instant createdAt,
        Instant completedAt
) {
    public static ReportResponse fromEntity(ResearchReport r) {
        return new ReportResponse(
                r.getId(),
                r.getResearchTask().getId(),
                r.getVersion(),
                r.getTitle(),
                r.getExecutiveSummary(),
                r.getStatus(),
                r.getContentMarkdown(),
                r.getGeneratedByExecutionId(),
                r.getCreatedAt(),
                r.getCompletedAt()
        );
    }
}
