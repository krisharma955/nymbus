package com.graviton.nymbus.evidence.repository;

import com.graviton.nymbus.evidence.entity.EvidenceSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EvidenceSourceRepository extends JpaRepository<EvidenceSource, UUID> {
    List<EvidenceSource> findByEvidenceId(UUID evidenceId);
    List<EvidenceSource> findBySourceId(UUID sourceId);
}
