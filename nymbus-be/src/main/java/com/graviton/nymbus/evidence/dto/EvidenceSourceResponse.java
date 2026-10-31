package com.graviton.nymbus.evidence.dto;

import com.graviton.nymbus.evidence.entity.EvidenceSource;
import com.graviton.nymbus.evidence.entity.SupportType;
import com.graviton.nymbus.source.dto.SourceResponse;

import java.time.Instant;
import java.util.UUID;

public record EvidenceSourceResponse(
        UUID id,
        UUID evidenceId,
        SourceResponse source,
        String sourceLocator,
        SupportType supportType,
        String relevantPassage,
        Instant createdAt
) {
    public static EvidenceSourceResponse fromEntity(EvidenceSource es) {
        if (es == null) return null;
        return new EvidenceSourceResponse(
                es.getId(),
                es.getEvidence() != null ? es.getEvidence().getId() : null,
                es.getSource() != null ? SourceResponse.fromEntity(es.getSource()) : null,
                es.getSourceLocator(),
                es.getSupportType(),
                es.getRelevantPassage(),
                es.getCreatedAt()
        );
    }
}
