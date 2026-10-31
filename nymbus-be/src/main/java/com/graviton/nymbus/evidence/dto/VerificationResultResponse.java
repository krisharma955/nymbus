package com.graviton.nymbus.evidence.dto;

import com.graviton.nymbus.evidence.entity.VerificationResult;
import com.graviton.nymbus.evidence.entity.VerificationStatus;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record VerificationResultResponse(
        UUID id,
        UUID evidenceId,
        UUID agentExecutionId,
        VerificationStatus status,
        String explanation,
        Instant checkedAt,
        Map<String, Object> metadata
) {
    public static VerificationResultResponse fromEntity(VerificationResult vr) {
        if (vr == null) return null;
        return new VerificationResultResponse(
                vr.getId(),
                vr.getEvidence() != null ? vr.getEvidence().getId() : null,
                vr.getAgentExecution() != null ? vr.getAgentExecution().getId() : null,
                vr.getStatus(),
                vr.getExplanation(),
                vr.getCheckedAt(),
                vr.getMetadata()
        );
    }
}
