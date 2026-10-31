package com.graviton.nymbus.conversation.dto;

import java.util.UUID;

public record ReportReferenceDto(
        UUID taskId,
        UUID reportId,
        int turnIndex,
        String title,
        String executiveSummary
) {}
