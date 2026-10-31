package com.graviton.nymbus.agent.dto;

import java.util.List;
import java.util.UUID;

public record ReportSectionOutput(
        String sectionKey,
        String title,
        String contentMarkdown,
        int sectionOrder,
        List<UUID> citedEvidenceIds
) {}
