package com.graviton.nymbus.agent.dto;

import java.util.List;

public record AnalysisOutput(
        String synthesisOverview,
        List<String> keyFindings,
        List<AnalysisFactDto> sourcedFacts,
        List<AnalysisAssumptionDto> assumptions,
        List<AnalysisCalculationDto> calculations,
        List<String> recommendations
) {}
