package com.graviton.nymbus.research.repository;

import com.graviton.nymbus.research.entity.ResearchTask;
import com.graviton.nymbus.research.entity.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResearchTaskRepository extends JpaRepository<ResearchTask, UUID> {

    Page<ResearchTask> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Optional<ResearchTask> findByIdAndUserId(UUID id, UUID userId);

    java.util.List<ResearchTask> findByConversationIdOrderByCreatedAtDesc(UUID conversationId);

    Optional<ResearchTask> findFirstByConversationIdAndStatusInOrderByCreatedAtDesc(
            UUID conversationId, java.util.Collection<TaskStatus> statuses);

    @Modifying
    @Query("UPDATE ResearchTask t SET t.status = :targetStatus, t.startedAt = :now " +
           "WHERE t.id = :taskId AND t.status = :expectedStatus")
    int transitionStatusIfExpected(
            @Param("taskId") UUID taskId,
            @Param("expectedStatus") TaskStatus expectedStatus,
            @Param("targetStatus") TaskStatus targetStatus,
            @Param("now") Instant now);
}
