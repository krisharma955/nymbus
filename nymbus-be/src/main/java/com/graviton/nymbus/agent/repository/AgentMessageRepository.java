package com.graviton.nymbus.agent.repository;

import com.graviton.nymbus.agent.entity.AgentMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AgentMessageRepository extends JpaRepository<AgentMessage, UUID> {
    List<AgentMessage> findByResearchTaskIdOrderByCreatedAtAsc(UUID researchTaskId);
    List<AgentMessage> findBySenderExecutionId(UUID senderExecutionId);
}
