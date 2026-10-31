package com.graviton.nymbus.agent.dto;

import java.util.List;

public record PlanOutput(
        String overview,
        List<PlannedSubTaskDto> subTasks
) {}
