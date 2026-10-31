package com.graviton.nymbus.agent.repository;

import com.graviton.nymbus.agent.entity.AgentExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AgentExecutionRepository extends JpaRepository<AgentExecution, UUID> {

    List<AgentExecution> findByResearchTaskIdOrderByStartedAtAsc(UUID researchTaskId);

    List<AgentExecution> findBySubTaskIdOrderByAttemptNumberAsc(UUID subTaskId);

    Optional<AgentExecution> findTopBySubTaskIdOrderByAttemptNumberDesc(UUID subTaskId);
}
