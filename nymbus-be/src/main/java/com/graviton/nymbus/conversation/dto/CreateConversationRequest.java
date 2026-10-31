package com.graviton.nymbus.conversation.dto;

import jakarta.validation.constraints.Size;

public record CreateConversationRequest(
        @Size(max = 250, message = "Title must not exceed 250 characters")
        String title
) {
    public String resolveTitle() {
        if (title == null || title.trim().isBlank()) {
            return "New Conversation";
        }
        return title.trim();
    }
}
