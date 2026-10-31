package com.graviton.nymbus.conversation.dto;

import java.util.UUID;

public record CitationDto(
        String id,
        String sourceType,
        String title,
        String url,
        UUID documentId,
        UUID chunkId,
        String excerpt
) {}
