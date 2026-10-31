package com.graviton.nymbus.agent.dto;

public record AnalysisCalculationDto(
        String label,
        String formula,
        String computedValue,
        boolean isEstimate
) {}
