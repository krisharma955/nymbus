package com.graviton.nymbus.evidence.dto;

import com.graviton.nymbus.evidence.entity.Evidence;
import com.graviton.nymbus.evidence.entity.VerificationStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record EvidenceResponse(
        UUID id,
        UUID researchTaskId,
        UUID createdByExecutionId,
        String claim,
        String supportingPassage,
        String claimType,
        VerificationStatus verificationStatus,
        BigDecimal confidenceScore,
        Instant createdAt,
        Instant updatedAt
) {
    public static EvidenceResponse fromEntity(Evidence evidence) {
        if (evidence == null) return null;
        return new EvidenceResponse(
                evidence.getId(),
                evidence.getResearchTask() != null ? evidence.getResearchTask().getId() : null,
                evidence.getCreatedByExecution() != null ? evidence.getCreatedByExecution().getId() : null,
                evidence.getClaim(),
                evidence.getSupportingPassage(),
                evidence.getClaimType(),
                evidence.getVerificationStatus(),
                evidence.getConfidenceScore(),
                evidence.getCreatedAt(),
                evidence.getUpdatedAt()
        );
    }
}
