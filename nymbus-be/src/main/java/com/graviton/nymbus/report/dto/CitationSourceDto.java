package com.graviton.nymbus.report.dto;

import com.graviton.nymbus.source.entity.SourceType;

import java.util.UUID;

public record CitationSourceDto(
        UUID sourceId,
        String title,
        String url,
        String domain,
        SourceType sourceType,
        String sourceLocator
) {}
