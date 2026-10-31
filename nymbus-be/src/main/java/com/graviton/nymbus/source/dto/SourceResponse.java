package com.graviton.nymbus.source.dto;

import com.graviton.nymbus.source.entity.Source;
import com.graviton.nymbus.source.entity.SourceType;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

public record SourceResponse(
        UUID id,
        UUID researchTaskId,
        String url,
        String canonicalUrlHash,
        String title,
        String domain,
        SourceType sourceType,
        String publisher,
        LocalDate publishedAt,
        String cleanedText,
        Instant retrievedAt,
        Map<String, Object> rawMetadata
) {
    public static SourceResponse fromEntity(Source source) {
        if (source == null) return null;
        return new SourceResponse(
                source.getId(),
                source.getResearchTask() != null ? source.getResearchTask().getId() : null,
                source.getUrl(),
                source.getCanonicalUrlHash(),
                source.getTitle(),
                source.getDomain(),
                source.getSourceType(),
                source.getPublisher(),
                source.getPublishedAt(),
                source.getCleanedText(),
                source.getRetrievedAt(),
                source.getRawMetadata()
        );
    }
}
