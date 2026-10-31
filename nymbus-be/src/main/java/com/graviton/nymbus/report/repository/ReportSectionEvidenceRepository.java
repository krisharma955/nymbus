package com.graviton.nymbus.report.repository;

import com.graviton.nymbus.report.entity.ReportSectionEvidence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReportSectionEvidenceRepository extends JpaRepository<ReportSectionEvidence, UUID> {

    List<ReportSectionEvidence> findByReportSectionId(UUID reportSectionId);

    @Query("""
            SELECT rse FROM ReportSectionEvidence rse
            JOIN FETCH rse.evidence e
            WHERE rse.reportSection.id = :sectionId
            ORDER BY rse.createdAt ASC
            """)
    List<ReportSectionEvidence> findByReportSectionIdWithEvidence(@Param("sectionId") UUID sectionId);

    @Query("""
            SELECT rse FROM ReportSectionEvidence rse
            JOIN FETCH rse.evidence e
            WHERE rse.reportSection.report.id = :reportId
            ORDER BY rse.reportSection.sectionOrder ASC, rse.createdAt ASC
            """)
    List<ReportSectionEvidence> findByReportIdWithEvidence(@Param("reportId") UUID reportId);

    void deleteByReportSectionId(UUID reportSectionId);
}
