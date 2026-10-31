package com.graviton.nymbus.report.repository;

import com.graviton.nymbus.report.entity.ReportSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReportSectionRepository extends JpaRepository<ReportSection, UUID> {

    List<ReportSection> findByReportIdOrderBySectionOrderAsc(UUID reportId);

    Optional<ReportSection> findByReportIdAndSectionKey(UUID reportId, String sectionKey);

    void deleteByReportId(UUID reportId);
}
