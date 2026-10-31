package com.graviton.nymbus.agent.dto;

public record AnalysisAssumptionDto(
        String assumption,
        String basis,
        String riskLevel
) {}
