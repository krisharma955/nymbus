package com.graviton.nymbus.tool.repository;

import com.graviton.nymbus.tool.entity.ToolExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ToolExecutionRepository extends JpaRepository<ToolExecution, UUID> {
    List<ToolExecution> findByAgentExecutionIdOrderByStartedAtAsc(UUID agentExecutionId);
}
