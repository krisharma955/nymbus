package com.graviton.nymbus.conversation.dto;

import com.graviton.nymbus.conversation.entity.ConversationMessage;
import com.graviton.nymbus.conversation.entity.MessageRole;
import com.graviton.nymbus.conversation.entity.MessageStatus;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record ConversationMessageResponse(
        UUID id,
        UUID conversationId,
        MessageRole role,
        String content,
        MessageStatus status,
        UUID researchTaskId,
        Map<String, Object> metadata,
        Instant createdAt
) {
    public static ConversationMessageResponse fromEntity(ConversationMessage msg) {
        if (msg == null) return null;
        return new ConversationMessageResponse(
                msg.getId(),
                msg.getConversation() != null ? msg.getConversation().getId() : null,
                msg.getRole(),
                msg.getContent(),
                msg.getStatus(),
                msg.getResearchTaskId(),
                msg.getMetadata(),
                msg.getCreatedAt()
        );
    }
}
