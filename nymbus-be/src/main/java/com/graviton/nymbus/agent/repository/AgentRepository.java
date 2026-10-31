package com.graviton.nymbus.agent.repository;

import com.graviton.nymbus.agent.entity.Agent;
import com.graviton.nymbus.agent.entity.AgentCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AgentRepository extends JpaRepository<Agent, UUID> {
    Optional<Agent> findByCode(AgentCode code);
}
