package com.graviton.nymbus.conversation.dto;

import com.graviton.nymbus.conversation.entity.Conversation;

import java.time.Instant;
import java.util.UUID;

public record ConversationResponse(
        UUID id,
        UUID userId,
        String title,
        String summary,
        Instant summaryUpdatedAt,
        Instant lastMessageAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static ConversationResponse fromEntity(Conversation conv) {
        if (conv == null) return null;
        return new ConversationResponse(
                conv.getId(),
                conv.getUser() != null ? conv.getUser().getId() : null,
                conv.getTitle(),
                conv.getSummary(),
                conv.getSummaryUpdatedAt(),
                conv.getLastMessageAt(),
                conv.getCreatedAt(),
                conv.getUpdatedAt()
        );
    }
}
