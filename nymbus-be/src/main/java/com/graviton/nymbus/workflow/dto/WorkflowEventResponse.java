package com.graviton.nymbus.workflow.dto;

import com.graviton.nymbus.workflow.entity.WorkflowEvent;
import com.graviton.nymbus.workflow.entity.WorkflowEventType;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record WorkflowEventResponse(
        UUID id,
        UUID researchTaskId,
        UUID subTaskId,
        UUID agentExecutionId,
        WorkflowEventType eventType,
        String message,
        Map<String, Object> metadata,
        Instant createdAt
) {
    public static WorkflowEventResponse fromEntity(WorkflowEvent event) {
        if (event == null) return null;
        return new WorkflowEventResponse(
                event.getId(),
                event.getResearchTask() != null ? event.getResearchTask().getId() : null,
                event.getSubTask() != null ? event.getSubTask().getId() : null,
                event.getAgentExecution() != null ? event.getAgentExecution().getId() : null,
                event.getEventType(),
                event.getMessage(),
                event.getMetadata(),
                event.getCreatedAt()
        );
    }
}
