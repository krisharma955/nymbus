package com.graviton.nymbus.workflow.repository;

import com.graviton.nymbus.workflow.entity.WorkflowEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface WorkflowEventRepository extends JpaRepository<WorkflowEvent, UUID> {
    List<WorkflowEvent> findByResearchTaskIdOrderByCreatedAtAsc(UUID researchTaskId);
    List<WorkflowEvent> findByResearchTaskIdAndCreatedAtGreaterThanOrderByCreatedAtAsc(UUID researchTaskId, Instant createdAt);
}
