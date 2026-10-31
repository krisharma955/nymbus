package com.graviton.nymbus.agent.dto;

import java.util.UUID;

public record AnalysisFactDto(
        String fact,
        UUID evidenceId,
        String sourceUrl
) {}
