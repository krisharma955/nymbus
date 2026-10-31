package com.graviton.nymbus.report.repository;

import com.graviton.nymbus.report.entity.ResearchReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResearchReportRepository extends JpaRepository<ResearchReport, UUID> {

    List<ResearchReport> findByResearchTaskIdOrderByVersionDesc(UUID researchTaskId);

    Optional<ResearchReport> findTopByResearchTaskIdOrderByVersionDesc(UUID researchTaskId);

    Optional<ResearchReport> findByResearchTaskIdAndVersion(UUID researchTaskId, int version);
}
