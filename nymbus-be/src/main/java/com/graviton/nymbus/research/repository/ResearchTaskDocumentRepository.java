package com.graviton.nymbus.research.repository;

import com.graviton.nymbus.research.entity.ResearchTaskDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ResearchTaskDocumentRepository extends JpaRepository<ResearchTaskDocument, UUID> {

    List<ResearchTaskDocument> findByResearchTaskId(UUID researchTaskId);

    List<ResearchTaskDocument> findByDocumentId(UUID documentId);

    boolean existsByResearchTaskIdAndDocumentId(UUID researchTaskId, UUID documentId);
}
