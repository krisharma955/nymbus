package com.graviton.nymbus.conversation.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

public record SendMessageRequest(
        @NotBlank(message = "Message content must not be blank")
        String content,
        List<UUID> documentIds,
        Boolean deepResearch
) {
    public List<UUID> documentIds() {
        return documentIds != null ? documentIds : Collections.emptyList();
    }

    public boolean isDeepResearch() {
        return Boolean.TRUE.equals(deepResearch);
    }
}
