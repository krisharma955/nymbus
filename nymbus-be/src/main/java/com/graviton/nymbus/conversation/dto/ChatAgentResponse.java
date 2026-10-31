package com.graviton.nymbus.conversation.dto;

import java.util.List;

public record ChatAgentResponse(
        String contentMarkdown,
        List<CitationDto> citations
) {}
