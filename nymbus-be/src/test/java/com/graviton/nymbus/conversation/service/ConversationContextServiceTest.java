package com.graviton.nymbus.conversation.service;

import com.graviton.nymbus.conversation.config.ChatProperties;
import com.graviton.nymbus.conversation.entity.Conversation;
import com.graviton.nymbus.conversation.entity.ConversationMessage;
import com.graviton.nymbus.conversation.entity.MessageRole;
import com.graviton.nymbus.document.service.DocumentService;
import com.graviton.nymbus.report.repository.ResearchReportRepository;
import com.graviton.nymbus.research.repository.ResearchTaskRepository;
import com.graviton.nymbus.tool.WebSearchTool;
import com.graviton.nymbus.tool.model.SearchResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConversationContextServiceTest {

    @Mock
    private ConversationMessageService conversationMessageService;

    @Mock
    private DocumentService documentService;

    @Mock
    private WebSearchTool webSearchTool;

    @Mock
    private ResearchTaskRepository researchTaskRepository;

    @Mock
    private ResearchReportRepository researchReportRepository;

    @Mock
    private ChatProperties chatProperties;

    @InjectMocks
    private ConversationContextService conversationContextService;

    private Conversation conversation;
    private UUID conversationId;

    @BeforeEach
    void setUp() {
        conversationId = UUID.randomUUID();
        conversation = Conversation.builder()
                .id(conversationId)
                .title("Rocket Exploration")
                .summary("Previous discussion covered Falcon 9 reuse rates.")
                .build();

        lenient().when(chatProperties.getMaxHistoryMessages()).thenReturn(20);
        lenient().when(chatProperties.getMaxSearchResults()).thenReturn(4);
        lenient().when(chatProperties.getRetrievedChunkCount()).thenReturn(8);
        lenient().when(chatProperties.getMaxVectorDistance()).thenReturn(0.70);
        lenient().when(chatProperties.getMaxContextChars()).thenReturn(24000);
    }

    @Test
    void buildContextualSearchQuery_FollowUpPrependsPreviousUserSubject() {
        ConversationMessage prevUserMsg = ConversationMessage.builder()
                .role(MessageRole.USER)
                .content("Analyze the reusable rocket market dynamics.")
                .build();

        String query = conversationContextService.buildContextualSearchQuery(
                "What about pricing?", List.of(prevUserMsg));

        assertTrue(query.toLowerCase().contains("pricing"));
        assertTrue(query.toLowerCase().contains("reusable rocket market"));
    }

    @Test
    void buildContextualSearchQuery_StandaloneQueryKeptIntact() {
        String query = conversationContextService.buildContextualSearchQuery(
                "Explain the latest advances in nuclear fusion power generation.", Collections.emptyList());

        assertEquals("Explain the latest advances in nuclear fusion power generation.", query);
    }

    @Test
    void assembleContext_GracefullyHandlesTavilyFailure() {
        when(conversationMessageService.getRecentMessages(eq(conversationId), anyInt()))
                .thenReturn(Collections.emptyList());
        when(webSearchTool.search(anyString(), anyInt()))
                .thenThrow(new IllegalStateException("Tavily rate limit exceeded"));

        ConversationContextService.AssembledContext context = conversationContextService.assembleContext(
                conversation, "Latest orbital launches", Collections.emptyList());

        assertNotNull(context);
        assertTrue(context.webSearchFailed());
        assertTrue(context.webResults().isEmpty());
        assertEquals("Previous discussion covered Falcon 9 reuse rates.", context.conversationSummary());
    }

    @Test
    void assembleContext_PopulatesWebResultsAndSummary() {
        when(conversationMessageService.getRecentMessages(eq(conversationId), anyInt()))
                .thenReturn(Collections.emptyList());
        when(webSearchTool.search(anyString(), anyInt()))
                .thenReturn(List.of(new SearchResult("Rocket Lab Success", "https://rocketlab.com", "Electron rocket launched", 1.0)));

        ConversationContextService.AssembledContext context = conversationContextService.assembleContext(
                conversation, "Rocket Lab updates", Collections.emptyList());

        assertNotNull(context);
        assertFalse(context.webSearchFailed());
        assertEquals(1, context.webResults().size());
        assertEquals("Rocket Lab Success", context.webResults().get(0).title());
    }
}
