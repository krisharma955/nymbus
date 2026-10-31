package com.graviton.nymbus.research.dto;

import com.graviton.nymbus.research.entity.ExecutionMode;
import com.graviton.nymbus.research.entity.ResearchTask;
import com.graviton.nymbus.research.entity.TaskStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record TaskResponse(
        UUID id,
        UUID userId,
        String title,
        String prompt,
        TaskStatus status,
        ExecutionMode executionMode,
        Map<String, Object> plan,
        String failureReason,
        Integer tokenBudget,
        int tokensUsed,
        BigDecimal costBudgetUsd,
        BigDecimal costUsedUsd,
        Long version,
        Instant startedAt,
        Instant completedAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static TaskResponse fromEntity(ResearchTask task) {
        return new TaskResponse(
                task.getId(),
                task.getUser().getId(),
                task.getTitle(),
                task.getPrompt(),
                task.getStatus(),
                task.getExecutionMode(),
                task.getPlan(),
                task.getFailureReason(),
                task.getTokenBudget(),
                task.getTokensUsed(),
                task.getCostBudgetUsd(),
                task.getCostUsedUsd(),
                task.getVersion(),
                task.getStartedAt(),
                task.getCompletedAt(),
                task.getCreatedAt(),
                task.getUpdatedAt()
        );
    }
}
