package com.graviton.nymbus.research.event;

import java.util.UUID;

public record ResearchTaskCompletedEvent(
        UUID taskId,
        UUID reportId,
        String reportTitle,
        String executiveSummary
) {}
