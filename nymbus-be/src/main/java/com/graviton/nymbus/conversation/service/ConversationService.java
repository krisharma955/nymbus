package com.graviton.nymbus.conversation.service;

import com.graviton.nymbus.common.exception.ResourceNotFoundException;
import com.graviton.nymbus.conversation.dto.ConversationResponse;
import com.graviton.nymbus.conversation.dto.CreateConversationRequest;
import com.graviton.nymbus.conversation.dto.UpdateConversationRequest;
import com.graviton.nymbus.conversation.entity.Conversation;
import com.graviton.nymbus.conversation.repository.ConversationRepository;
import com.graviton.nymbus.user.entity.User;
import com.graviton.nymbus.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final CurrentUserService currentUserService;

    @Transactional
    public ConversationResponse createConversation(CreateConversationRequest request) {
        User user = currentUserService.getCurrentUser();
        return createConversation(request, user);
    }

    @Transactional
    public ConversationResponse createConversation(CreateConversationRequest request, User user) {
        String resolvedTitle = request != null ? request.resolveTitle() : "New Conversation";
        Conversation conversation = Conversation.builder()
                .user(user)
                .title(resolvedTitle)
                .lastMessageAt(Instant.now())
                .build();

        conversation = conversationRepository.save(conversation);
        log.info("Created conversation {} ('{}') for user {}", conversation.getId(), conversation.getTitle(), user.getId());
        return ConversationResponse.fromEntity(conversation);
    }

    @Transactional(readOnly = true)
    public Page<ConversationResponse> listConversations(Pageable pageable) {
        User user = currentUserService.getCurrentUser();
        return listConversations(pageable, user);
    }

    @Transactional(readOnly = true)
    public Page<ConversationResponse> listConversations(Pageable pageable, User user) {
        return conversationRepository.findByUserIdOrderByLastMessageAtDesc(user.getId(), pageable)
                .map(ConversationResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public ConversationResponse getConversation(UUID id) {
        Conversation conversation = getConversationWithOwnershipCheck(id);
        return ConversationResponse.fromEntity(conversation);
    }

    @Transactional(readOnly = true)
    public ConversationResponse getConversation(UUID id, User user) {
        Conversation conversation = getConversationWithOwnershipCheck(id, user);
        return ConversationResponse.fromEntity(conversation);
    }

    @Transactional
    public ConversationResponse updateConversation(UUID id, UpdateConversationRequest request) {
        User user = currentUserService.getCurrentUser();
        return updateConversation(id, request, user);
    }

    @Transactional
    public ConversationResponse updateConversation(UUID id, UpdateConversationRequest request, User user) {
        Conversation conversation = getConversationWithOwnershipCheck(id, user);
        String updatedTitle = request.title() != null && !request.title().trim().isBlank()
                ? request.title().trim() : "New Conversation";
        conversation.setTitle(updatedTitle);
        conversation = conversationRepository.save(conversation);
        log.info("Updated conversation {} title to '{}'", id, conversation.getTitle());
        return ConversationResponse.fromEntity(conversation);
    }

    @Transactional
    public void deleteConversation(UUID id) {
        User user = currentUserService.getCurrentUser();
        deleteConversation(id, user);
    }

    @Transactional
    public void deleteConversation(UUID id, User user) {
        Conversation conversation = getConversationWithOwnershipCheck(id, user);
        conversationRepository.delete(conversation);
        log.info("Deleted conversation {}", id);
    }

    @Transactional
    public void touchLastMessageAt(UUID id, Instant timestamp) {
        conversationRepository.findById(id).ifPresent(c -> {
            c.setLastMessageAt(timestamp != null ? timestamp : Instant.now());
            conversationRepository.save(c);
        });
    }

    @Transactional
    public void updateTitleIfDefault(UUID id, String firstMessageContent) {
        if (firstMessageContent == null || firstMessageContent.isBlank()) {
            return;
        }
        conversationRepository.findById(id).ifPresent(c -> {
            if ("New Conversation".equalsIgnoreCase(c.getTitle())) {
                String cleanContent = firstMessageContent.trim().replaceAll("\\s+", " ");
                String newTitle = cleanContent.length() > 60
                        ? cleanContent.substring(0, 57).trim() + "..."
                        : cleanContent;
                c.setTitle(newTitle);
                conversationRepository.save(c);
                log.info("Auto-assigned title for conversation {}: '{}'", id, newTitle);
            }
        });
    }

    @Transactional(readOnly = true)
    public Conversation getConversationWithOwnershipCheck(UUID id) {
        User user = currentUserService.getCurrentUser();
        return getConversationWithOwnershipCheck(id, user);
    }

    @Transactional(readOnly = true)
    public Conversation getConversationWithOwnershipCheck(UUID id, User user) {
        return conversationRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found with id: " + id));
    }
}
