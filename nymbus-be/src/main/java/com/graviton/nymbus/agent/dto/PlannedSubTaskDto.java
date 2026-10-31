package com.graviton.nymbus.agent.dto;

import java.util.List;

public record PlannedSubTaskDto(
        String tempId,
        String title,
        String description,
        int priority,
        List<String> dependsOnTempIds
) {}
