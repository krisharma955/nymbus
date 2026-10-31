package com.graviton.nymbus.agent.dto;

import java.util.UUID;

public record SubTaskSummaryDto(
        UUID id,
        String title,
        String description,
        String resultSummary
) {}
