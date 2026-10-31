package com.graviton.nymbus.conversation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateConversationRequest(
        @NotBlank(message = "Title must not be blank")
        @Size(max = 250, message = "Title must not exceed 250 characters")
        String title
) {}
