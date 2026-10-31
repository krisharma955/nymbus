package com.graviton.nymbus.research.dto;

import com.graviton.nymbus.research.entity.ExecutionMode;
import com.graviton.nymbus.research.entity.TaskStatus;
import lombok.Builder;

import java.time.Instant;
import java.util.UUID;

@Builder
public record ResearchTaskStatusResponse(
        UUID taskId,
        UUID conversationId,
        UUID messageId,
        TaskStatus status,
        ExecutionMode executionMode,
        String title,
        UUID reportId,
        String reportTitle,
        String errorMessage,
        Instant startedAt,
        Instant completedAt,
        Instant createdAt,
        Instant updatedAt
) {
}
