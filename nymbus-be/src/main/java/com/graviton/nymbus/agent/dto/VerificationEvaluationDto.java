package com.graviton.nymbus.agent.dto;

import com.graviton.nymbus.evidence.entity.SupportType;
import com.graviton.nymbus.evidence.entity.VerificationStatus;

public record VerificationEvaluationDto(
        VerificationStatus status,
        SupportType supportType,
        String explanation,
        double confidenceScore
) {
    public VerificationEvaluationDto {
        if (confidenceScore > 1.0 && confidenceScore <= 100.0) {
            confidenceScore = confidenceScore / 100.0;
        }
        confidenceScore = Math.round(Math.max(0.0, Math.min(1.0, confidenceScore)) * 1000.0) / 1000.0;
    }
}
