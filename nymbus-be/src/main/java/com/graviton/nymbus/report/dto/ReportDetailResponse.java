package com.graviton.nymbus.report.dto;

import com.graviton.nymbus.report.entity.ReportStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ReportDetailResponse(
        UUID id,
        UUID researchTaskId,
        int version,
        String title,
        String executiveSummary,
        ReportStatus status,
        String contentMarkdown,
        UUID generatedByExecutionId,
        List<ReportSectionResponse> sections,
        Instant createdAt,
        Instant completedAt
) {}
