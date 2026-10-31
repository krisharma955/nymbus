package com.graviton.nymbus.evidence.dto;

import com.graviton.nymbus.evidence.entity.Evidence;
import com.graviton.nymbus.evidence.entity.EvidenceSource;
import com.graviton.nymbus.evidence.entity.VerificationResult;

import java.util.List;

public record EvidenceDetailResponse(
        EvidenceResponse evidence,
        List<EvidenceSourceResponse> sources,
        List<VerificationResultResponse> verificationResults
) {
    public static EvidenceDetailResponse of(
            Evidence evidence,
            List<EvidenceSource> sources,
            List<VerificationResult> results
    ) {
        return new EvidenceDetailResponse(
                EvidenceResponse.fromEntity(evidence),
                sources != null ? sources.stream().map(EvidenceSourceResponse::fromEntity).toList() : List.of(),
                results != null ? results.stream().map(VerificationResultResponse::fromEntity).toList() : List.of()
        );
    }
}
