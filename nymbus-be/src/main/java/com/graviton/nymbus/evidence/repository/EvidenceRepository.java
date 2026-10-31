package com.graviton.nymbus.evidence.repository;

import com.graviton.nymbus.evidence.entity.Evidence;
import com.graviton.nymbus.evidence.entity.VerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EvidenceRepository extends JpaRepository<Evidence, UUID> {
    List<Evidence> findByResearchTaskIdOrderByCreatedAtAsc(UUID researchTaskId);
    List<Evidence> findByResearchTaskIdAndVerificationStatus(UUID researchTaskId, VerificationStatus status);
    List<Evidence> findByCreatedByExecutionId(UUID executionId);
    long countByResearchTaskIdAndVerificationStatus(UUID researchTaskId, VerificationStatus status);
}
