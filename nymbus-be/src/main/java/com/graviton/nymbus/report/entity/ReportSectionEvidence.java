package com.graviton.nymbus.report.entity;

import com.graviton.nymbus.evidence.entity.Evidence;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "report_section_evidence", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"report_section_id", "evidence_id"})
}, indexes = {
        @Index(name = "ix_rse_evidence", columnList = "evidence_id"),
        @Index(name = "ix_rse_section", columnList = "report_section_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportSectionEvidence {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_section_id", nullable = false)
    private ReportSection reportSection;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "evidence_id", nullable = false)
    private Evidence evidence;

    @Column(name = "citation_label", length = 40)
    private String citationLabel;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
