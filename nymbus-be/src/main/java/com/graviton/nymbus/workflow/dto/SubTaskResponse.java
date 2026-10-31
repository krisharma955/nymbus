package com.graviton.nymbus.workflow.dto;

import com.graviton.nymbus.agent.entity.AgentCode;
import com.graviton.nymbus.workflow.entity.SubTask;
import com.graviton.nymbus.workflow.entity.SubTaskStatus;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record SubTaskResponse(
        UUID id,
        UUID researchTaskId,
        AgentCode agentCode,
        String title,
        String description,
        SubTaskStatus status,
        int priority,
        Map<String, Object> inputPayload,
        String resultSummary,
        Long version,
        Instant startedAt,
        Instant completedAt,
        Instant createdAt
) {
    public static SubTaskResponse fromEntity(SubTask st) {
        return new SubTaskResponse(
                st.getId(),
                st.getResearchTask().getId(),
                st.getAgent().getCode(),
                st.getTitle(),
                st.getDescription(),
                st.getStatus(),
                st.getPriority(),
                st.getInputPayload(),
                st.getResultSummary(),
                st.getVersion(),
                st.getStartedAt(),
                st.getCompletedAt(),
                st.getCreatedAt()
        );
    }
}
