package com.graviton.nymbus.document.dto;

import com.graviton.nymbus.document.entity.Document;
import com.graviton.nymbus.document.entity.DocumentProcessingStatus;

import java.time.Instant;
import java.util.UUID;

public record DocumentResponse(
        UUID id,
        UUID researchTaskId,
        String fileName,
        String objectKey,
        String contentType,
        long fileSizeBytes,
        String checksumSha256,
        DocumentProcessingStatus processingStatus,
        String processingError,
        Instant createdAt,
        Instant processedAt
) {
    public static DocumentResponse fromEntity(Document doc) {
        if (doc == null) return null;
        return new DocumentResponse(
                doc.getId(),
                doc.getResearchTask() != null ? doc.getResearchTask().getId() : null,
                doc.getFileName(),
                doc.getObjectKey(),
                doc.getContentType(),
                doc.getFileSizeBytes(),
                doc.getChecksumSha256(),
                doc.getProcessingStatus(),
                doc.getProcessingError(),
                doc.getCreatedAt(),
                doc.getProcessedAt()
        );
    }
}
