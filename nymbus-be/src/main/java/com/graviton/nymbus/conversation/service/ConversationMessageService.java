package com.graviton.nymbus.conversation.service;

import com.graviton.nymbus.common.exception.ResourceNotFoundException;
import com.graviton.nymbus.conversation.dto.ConversationMessageResponse;
import com.graviton.nymbus.conversation.entity.Conversation;
import com.graviton.nymbus.conversation.entity.ConversationMessage;
import com.graviton.nymbus.conversation.entity.MessageRole;
import com.graviton.nymbus.conversation.entity.MessageStatus;
import com.graviton.nymbus.conversation.repository.ConversationMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationMessageService {

    private final ConversationMessageRepository conversationMessageRepository;
    private final ConversationService conversationService;

    @Transactional
    public ConversationMessage saveUserMessage(
            UUID conversationId,
            String content,
            List<UUID> documentIds,
            Map<String, Object> extraMetadata
    ) {
        Conversation conversation = conversationService.getConversationWithOwnershipCheck(conversationId);
        Instant now = Instant.now();

        Map<String, Object> metadata = new HashMap<>();
        if (extraMetadata != null) {
            metadata.putAll(extraMetadata);
        }
        if (documentIds != null && !documentIds.isEmpty()) {
            metadata.put("documentIds", documentIds.stream().map(UUID::toString).toList());
        }

        ConversationMessage msg = ConversationMessage.builder()
                .conversation(conversation)
                .role(MessageRole.USER)
                .content(content)
                .status(MessageStatus.COMPLETED)
                .metadata(metadata.isEmpty() ? null : metadata)
                .createdAt(now)
                .build();

        msg = conversationMessageRepository.save(msg);
        conversationService.touchLastMessageAt(conversationId, now);
        return msg;
    }

    @Transactional
    public ConversationMessage saveAssistantMessage(
            UUID conversationId,
            String content,
            MessageStatus status,
            UUID researchTaskId,
            Map<String, Object> metadata
    ) {
        Conversation conversation = conversationService.getConversationWithOwnershipCheck(conversationId);
        Instant now = Instant.now();

        ConversationMessage msg = ConversationMessage.builder()
                .conversation(conversation)
                .role(MessageRole.ASSISTANT)
                .content(content != null ? content : "")
                .status(status != null ? status : MessageStatus.COMPLETED)
                .researchTaskId(researchTaskId)
                .metadata(metadata)
                .createdAt(now)
                .build();

        msg = conversationMessageRepository.save(msg);
        conversationService.touchLastMessageAt(conversationId, now);
        return msg;
    }

    @Transactional
    public ConversationMessage updateAssistantMessage(
            UUID messageId,
            String content,
            MessageStatus status,
            UUID researchTaskId,
            Map<String, Object> metadataUpdates
    ) {
        ConversationMessage msg = conversationMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found with id: " + messageId));

        if (content != null) {
            msg.setContent(content);
        }
        if (status != null) {
            msg.setStatus(status);
        }
        if (researchTaskId != null) {
            msg.setResearchTaskId(researchTaskId);
        }
        if (metadataUpdates != null) {
            Map<String, Object> meta = msg.getMetadata() != null ? new HashMap<>(msg.getMetadata()) : new HashMap<>();
            meta.putAll(metadataUpdates);
            msg.setMetadata(meta);
        }

        return conversationMessageRepository.save(msg);
    }

    @Transactional(readOnly = true)
    public List<ConversationMessageResponse> listMessages(UUID conversationId, Instant before, int limit) {
        conversationService.getConversationWithOwnershipCheck(conversationId);
        int safeLimit = Math.max(1, Math.min(limit, 100));

        List<ConversationMessage> raw;
        if (before != null) {
            raw = conversationMessageRepository.findByConversationIdAndCreatedAtBeforeOrderByCreatedAtDesc(
                    conversationId, before, PageRequest.of(0, safeLimit));
        } else {
            raw = conversationMessageRepository.findByConversationIdOrderByCreatedAtDesc(
                    conversationId, PageRequest.of(0, safeLimit));
        }

        // Return in chronological order
        List<ConversationMessage> chronological = new ArrayList<>(raw);
        Collections.reverse(chronological);

        return chronological.stream()
                .map(ConversationMessageResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ConversationMessage> getRecentMessages(UUID conversationId, int limit) {
        List<ConversationMessage> raw = conversationMessageRepository.findByConversationIdOrderByCreatedAtDesc(
                conversationId, PageRequest.of(0, Math.max(1, limit)));
        List<ConversationMessage> chronological = new ArrayList<>(raw);
        Collections.reverse(chronological);
        return chronological;
    }

    @Transactional(readOnly = true)
    public long getMessageCount(UUID conversationId) {
        return conversationMessageRepository.countByConversationId(conversationId);
    }
}
