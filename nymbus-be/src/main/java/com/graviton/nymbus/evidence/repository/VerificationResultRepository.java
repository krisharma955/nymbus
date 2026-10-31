package com.graviton.nymbus.evidence.repository;

import com.graviton.nymbus.evidence.entity.VerificationResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface VerificationResultRepository extends JpaRepository<VerificationResult, UUID> {
    List<VerificationResult> findByEvidenceIdOrderByCheckedAtDesc(UUID evidenceId);
    List<VerificationResult> findByAgentExecutionId(UUID agentExecutionId);
}
