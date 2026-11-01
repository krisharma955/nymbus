package com.graviton.nymbus.conversation.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.graviton.nymbus.conversation.dto.ChatAgentResponse;
import com.graviton.nymbus.conversation.dto.CitationDto;
import com.graviton.nymbus.conversation.entity.ConversationMessage;
import com.graviton.nymbus.conversation.entity.MessageRole;
import com.graviton.nymbus.document.entity.Document;
import com.graviton.nymbus.document.entity.DocumentChunk;
import com.graviton.nymbus.tool.model.SearchResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClient;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatAgentTest {

    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    private ChatClient chatClient;

    private ObjectMapper objectMapper;
    private ChatAgent chatAgent;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        chatAgent = new ChatAgent(chatClient, objectMapper);
    }

    @Test
    void generateAnswer_SuccessfulLlmCall_ReturnsSynthesizedAnswerAndCitations() {
        String llmJson = """
                {
                  "answerMarkdown": "Autonomous rockets utilize advanced landing algorithms [W1].",
                  "citedReferenceIds": ["W1"]
                }
                """;

        when(chatClient.prompt()
                .system(anyString())
                .user(anyString())
                .call()
                .content()).thenReturn(llmJson);

        SearchResult sr = new SearchResult("Autonomous Landing", "https://rockets.com", "Advanced guidance system", 0.95);
        ChatAgentResponse response = chatAgent.generateAnswer(
                "Explain autonomous rockets",
                null,
                Collections.emptyList(),
                List.of(sr),
                Collections.emptyList(),
                Collections.emptyList(),
                false
        );

        assertNotNull(response);
        assertFalse(response.isFallback());
        assertTrue(response.contentMarkdown().contains("Autonomous rockets utilize advanced landing algorithms"));
        assertEquals(1, response.citations().size());
        assertEquals("Autonomous Landing", response.citations().get(0).title());
    }

    @Test
    void generateAnswer_LlmException_GracefullyFallsBackToContextualResponse() {
        when(chatClient.prompt()
                .system(anyString())
                .user(anyString())
                .call()
                .content()).thenThrow(new RuntimeException("OpenRouter 400: Model not found"));

        SearchResult sr = new SearchResult("Autonomous Landing", "https://rockets.com", "Advanced guidance system", 0.95);
        Document doc = Document.builder().id(UUID.randomUUID()).fileName("rockets.pdf").build();
        DocumentChunk chunk = DocumentChunk.builder().id(UUID.randomUUID()).document(doc).content("Rocket stage reuse").pageNumber(1).build();

        ChatAgentResponse response = chatAgent.generateAnswer(
                "Explain autonomous rockets",
                null,
                Collections.emptyList(),
                List.of(sr),
                List.of(chunk),
                Collections.emptyList(),
                false
        );

        assertNotNull(response);
        assertTrue(response.isFallback());
        assertTrue(response.contentMarkdown().contains("Note: AI conversational synthesis was temporarily unavailable"));
        assertTrue(response.contentMarkdown().contains("Autonomous Landing"));
        assertTrue(response.contentMarkdown().contains("rockets.pdf"));
        assertEquals(2, response.citations().size());
    }

    @Test
    void generateAnswer_WebSearchFailedNotice_ReflectedInFallback() {
        when(chatClient.prompt()
                .system(anyString())
                .user(anyString())
                .call()
                .content()).thenThrow(new RuntimeException("Connection timeout"));

        ChatAgentResponse response = chatAgent.generateAnswer(
                "Explain autonomous rockets",
                null,
                Collections.emptyList(),
                Collections.emptyList(),
                Collections.emptyList(),
                Collections.emptyList(),
                true
        );

        assertNotNull(response);
        assertTrue(response.isFallback());
        assertTrue(response.contentMarkdown().contains("Live web search was temporarily unavailable"));
    }
}
