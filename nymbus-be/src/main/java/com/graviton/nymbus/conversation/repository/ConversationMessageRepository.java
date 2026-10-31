package com.graviton.nymbus.conversation.repository;

import com.graviton.nymbus.conversation.entity.ConversationMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationMessageRepository extends JpaRepository<ConversationMessage, UUID> {

    List<ConversationMessage> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);

    Page<ConversationMessage> findByConversationIdOrderByCreatedAtAsc(UUID conversationId, Pageable pageable);

    List<ConversationMessage> findByConversationIdAndCreatedAtBeforeOrderByCreatedAtDesc(
            UUID conversationId, Instant before, Pageable pageable);

    List<ConversationMessage> findByConversationIdOrderByCreatedAtDesc(UUID conversationId, Pageable pageable);

    long countByConversationId(UUID conversationId);

    List<ConversationMessage> findByResearchTaskId(UUID researchTaskId);

    Optional<ConversationMessage> findFirstByResearchTaskIdOrderByCreatedAtDesc(UUID researchTaskId);
}
