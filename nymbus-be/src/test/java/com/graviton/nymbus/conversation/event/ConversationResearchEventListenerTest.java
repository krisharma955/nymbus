package com.graviton.nymbus.conversation.event;

import com.graviton.nymbus.conversation.entity.Conversation;
import com.graviton.nymbus.conversation.entity.ConversationMessage;
import com.graviton.nymbus.conversation.entity.MessageRole;
import com.graviton.nymbus.conversation.entity.MessageStatus;
import com.graviton.nymbus.conversation.repository.ConversationMessageRepository;
import com.graviton.nymbus.research.event.ResearchTaskCompletedEvent;
import com.graviton.nymbus.research.event.ResearchTaskFailedEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConversationResearchEventListenerTest {

    @Mock
    private ConversationMessageRepository conversationMessageRepository;

    @InjectMocks
    private ConversationResearchEventListener listener;

    private UUID taskId;
    private UUID conversationId;
    private Conversation testConversation;
    private ConversationMessage message1;
    private ConversationMessage message2;

    @BeforeEach
    void setUp() {
        taskId = UUID.randomUUID();
        conversationId = UUID.randomUUID();

        testConversation = Conversation.builder()
                .id(conversationId)
                .title("Test Conversation")
                .build();

        message1 = ConversationMessage.builder()
                .id(UUID.randomUUID())
                .conversation(testConversation)
                .role(MessageRole.ASSISTANT)
                .status(MessageStatus.RESEARCHING)
                .researchTaskId(taskId)
                .metadata(new HashMap<>())
                .build();

        message2 = ConversationMessage.builder()
                .id(UUID.randomUUID())
                .conversation(testConversation)
                .role(MessageRole.ASSISTANT)
                .status(MessageStatus.RESEARCHING)
                .researchTaskId(taskId)
                .metadata(new HashMap<>())
                .build();
    }

    @Test
    void onResearchCompleted_UpdatesMultipleMessagesWithoutCrashing() {
        UUID reportId = UUID.randomUUID();
        ResearchTaskCompletedEvent event = new ResearchTaskCompletedEvent(
                taskId, reportId, "Executive Summary Content", "Final Report Title");

        when(conversationMessageRepository.findByResearchTaskId(taskId))
                .thenReturn(List.of(message1, message2));

        listener.onResearchCompleted(event);

        assertEquals(MessageStatus.COMPLETED, message1.getStatus());
        assertEquals(MessageStatus.COMPLETED, message2.getStatus());
        verify(conversationMessageRepository, times(2)).save(any(ConversationMessage.class));
    }

    @Test
    void onResearchFailed_UpdatesMessagesToFailedStatus() {
        ResearchTaskFailedEvent event = new ResearchTaskFailedEvent(taskId, "Agent execution error");

        when(conversationMessageRepository.findByResearchTaskId(taskId))
                .thenReturn(List.of(message1));

        listener.onResearchFailed(event);

        assertEquals(MessageStatus.FAILED, message1.getStatus());
        verify(conversationMessageRepository, times(1)).save(message1);
    }
}
