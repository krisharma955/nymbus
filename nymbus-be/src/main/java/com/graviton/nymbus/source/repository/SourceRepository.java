package com.graviton.nymbus.source.repository;

import com.graviton.nymbus.source.entity.Source;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SourceRepository extends JpaRepository<Source, UUID> {
    List<Source> findByResearchTaskIdOrderByRetrievedAtAsc(UUID researchTaskId);
    Optional<Source> findByResearchTaskIdAndCanonicalUrlHash(UUID researchTaskId, String canonicalUrlHash);
    boolean existsByResearchTaskIdAndCanonicalUrlHash(UUID researchTaskId, String canonicalUrlHash);
}
