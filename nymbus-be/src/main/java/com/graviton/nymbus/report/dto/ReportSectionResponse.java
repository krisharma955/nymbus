package com.graviton.nymbus.report.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ReportSectionResponse(
        UUID id,
        UUID reportId,
        String sectionKey,
        String title,
        String contentMarkdown,
        int sectionOrder,
        List<ReportCitationResponse> citations,
        Instant createdAt
) {}
