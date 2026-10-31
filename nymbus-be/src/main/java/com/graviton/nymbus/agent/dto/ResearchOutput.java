package com.graviton.nymbus.agent.dto;

import java.util.List;

public record ResearchOutput(
        String summary,
        List<ResearchFindingDto> findings,
        List<String> searchQueries
) {}
