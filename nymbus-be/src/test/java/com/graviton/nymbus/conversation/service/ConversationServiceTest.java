package com.graviton.nymbus.conversation.service;

import com.graviton.nymbus.common.exception.ResourceNotFoundException;
import com.graviton.nymbus.conversation.dto.ConversationResponse;
import com.graviton.nymbus.conversation.dto.CreateConversationRequest;
import com.graviton.nymbus.conversation.dto.UpdateConversationRequest;
import com.graviton.nymbus.conversation.entity.Conversation;
import com.graviton.nymbus.conversation.repository.ConversationRepository;
import com.graviton.nymbus.user.entity.User;
import com.graviton.nymbus.user.service.CurrentUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConversationServiceTest {

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private CurrentUserService currentUserService;

    @InjectMocks
    private ConversationService conversationService;

    private User testUser;
    private UUID userId;
    private UUID conversationId;
    private Conversation testConversation;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        conversationId = UUID.randomUUID();

        testUser = User.builder()
                .id(userId)
                .name("Test User")
                .email("test@nymbus.ai")
                .build();

        testConversation = Conversation.builder()
                .id(conversationId)
                .user(testUser)
                .title("Reusable Rocket Analysis")
                .lastMessageAt(Instant.now())
                .build();
    }

    @Test
    void createConversation_Success() {
        when(currentUserService.getCurrentUser()).thenReturn(testUser);
        when(conversationRepository.save(any(Conversation.class))).thenReturn(testConversation);

        ConversationResponse response = conversationService.createConversation(
                new CreateConversationRequest("Reusable Rocket Analysis"));

        assertNotNull(response);
        assertEquals("Reusable Rocket Analysis", response.title());
        assertEquals(conversationId, response.id());
        verify(conversationRepository).save(any(Conversation.class));
    }

    @Test
    void listConversations_Success() {
        when(currentUserService.getCurrentUser()).thenReturn(testUser);
        Page<Conversation> page = new PageImpl<>(List.of(testConversation));
        when(conversationRepository.findByUserIdOrderByLastMessageAtDesc(eq(userId), any(PageRequest.class)))
                .thenReturn(page);

        Page<ConversationResponse> result = conversationService.listConversations(PageRequest.of(0, 10));

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("Reusable Rocket Analysis", result.getContent().get(0).title());
    }

    @Test
    void getConversation_Success() {
        when(currentUserService.getCurrentUser()).thenReturn(testUser);
        when(conversationRepository.findByIdAndUserId(conversationId, userId))
                .thenReturn(Optional.of(testConversation));

        ConversationResponse response = conversationService.getConversation(conversationId);

        assertNotNull(response);
        assertEquals(conversationId, response.id());
    }

    @Test
    void getConversation_NotFound_ThrowsException() {
        when(currentUserService.getCurrentUser()).thenReturn(testUser);
        when(conversationRepository.findByIdAndUserId(conversationId, userId))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> conversationService.getConversation(conversationId));
    }

    @Test
    void updateConversation_Success() {
        when(currentUserService.getCurrentUser()).thenReturn(testUser);
        when(conversationRepository.findByIdAndUserId(conversationId, userId))
                .thenReturn(Optional.of(testConversation));
        when(conversationRepository.save(any(Conversation.class))).thenReturn(testConversation);

        ConversationResponse response = conversationService.updateConversation(
                conversationId, new UpdateConversationRequest("Updated Title"));

        assertNotNull(response);
        verify(conversationRepository).save(testConversation);
    }

    @Test
    void deleteConversation_Success() {
        when(currentUserService.getCurrentUser()).thenReturn(testUser);
        when(conversationRepository.findByIdAndUserId(conversationId, userId))
                .thenReturn(Optional.of(testConversation));

        conversationService.deleteConversation(conversationId);

        verify(conversationRepository).delete(testConversation);
    }
}
