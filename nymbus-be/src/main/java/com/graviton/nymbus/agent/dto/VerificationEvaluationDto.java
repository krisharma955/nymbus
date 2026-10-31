package com.graviton.nymbus.agent.dto;

import com.graviton.nymbus.evidence.entity.SupportType;
import com.graviton.nymbus.evidence.entity.VerificationStatus;

public record VerificationEvaluationDto(
        VerificationStatus status,
        SupportType supportType,
        String explanation,
        double confidenceScore
) {}
