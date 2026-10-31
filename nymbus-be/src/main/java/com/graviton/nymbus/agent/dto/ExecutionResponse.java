package com.graviton.nymbus.agent.dto;

import com.graviton.nymbus.agent.entity.AgentCode;
import com.graviton.nymbus.agent.entity.AgentExecution;
import com.graviton.nymbus.agent.entity.ExecutionStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record ExecutionResponse(
        UUID id,
        UUID researchTaskId,
        UUID subTaskId,
        AgentCode agentCode,
        int attemptNumber,
        ExecutionStatus status,
        Map<String, Object> inputPayload,
        Map<String, Object> outputPayload,
        String errorCode,
        String errorMessage,
        String modelName,
        Integer inputTokens,
        Integer outputTokens,
        BigDecimal costUsd,
        Long executionTimeMs,
        Instant startedAt,
        Instant completedAt
) {
    public static ExecutionResponse fromEntity(AgentExecution exec) {
        return new ExecutionResponse(
                exec.getId(),
                exec.getResearchTask().getId(),
                exec.getSubTask() != null ? exec.getSubTask().getId() : null,
                exec.getAgent().getCode(),
                exec.getAttemptNumber(),
                exec.getStatus(),
                exec.getInputPayload(),
                exec.getOutputPayload(),
                exec.getErrorCode(),
                exec.getErrorMessage(),
                exec.getModelName(),
                exec.getInputTokens(),
                exec.getOutputTokens(),
                exec.getCostUsd(),
                exec.getExecutionTimeMs(),
                exec.getStartedAt(),
                exec.getCompletedAt()
        );
    }
}
