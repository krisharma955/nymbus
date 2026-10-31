package com.graviton.nymbus.document.dto;

import com.graviton.nymbus.document.entity.DocumentChunk;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record DocumentChunkResponse(
        UUID id,
        UUID documentId,
        int chunkIndex,
        String content,
        Integer pageNumber,
        Integer tokenCount,
        Map<String, Object> metadata,
        Instant createdAt
) {
    public static DocumentChunkResponse fromEntity(DocumentChunk chunk) {
        if (chunk == null) return null;
        return new DocumentChunkResponse(
                chunk.getId(),
                chunk.getDocument() != null ? chunk.getDocument().getId() : null,
                chunk.getChunkIndex(),
                chunk.getContent(),
                chunk.getPageNumber(),
                chunk.getTokenCount(),
                chunk.getMetadata(),
                chunk.getCreatedAt()
        );
    }
}
