package com.graviton.nymbus.report.dto;

import com.graviton.nymbus.evidence.entity.VerificationStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ReportCitationResponse(
        UUID id,
        String citationLabel,
        UUID evidenceId,
        String claim,
        String supportingPassage,
        VerificationStatus verificationStatus,
        BigDecimal confidenceScore,
        List<CitationSourceDto> sources
) {}
