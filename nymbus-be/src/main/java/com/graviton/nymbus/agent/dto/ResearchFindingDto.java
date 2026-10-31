package com.graviton.nymbus.agent.dto;

public record ResearchFindingDto(
        String fact,
        String sourceUrl,
        String sourceTitle,
        String excerpt
) {}
