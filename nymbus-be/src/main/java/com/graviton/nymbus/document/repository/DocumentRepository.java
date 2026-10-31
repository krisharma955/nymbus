package com.graviton.nymbus.document.repository;

import com.graviton.nymbus.document.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {
    List<Document> findByResearchTaskIdAndUserIdOrderByCreatedAtDesc(UUID researchTaskId, UUID userId);
    List<Document> findByResearchTaskIdOrderByCreatedAtDesc(UUID researchTaskId);
    Optional<Document> findByIdAndUserId(UUID id, UUID userId);
    Optional<Document> findByResearchTaskIdAndChecksumSha256(UUID researchTaskId, String checksumSha256);
}
