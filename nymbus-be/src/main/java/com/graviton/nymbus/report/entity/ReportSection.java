package com.graviton.nymbus.report.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "report_sections", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"report_id", "section_order"}),
        @UniqueConstraint(columnNames = {"report_id", "section_key"})
}, indexes = {
        @Index(name = "ix_sections_report", columnList = "report_id, section_order")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportSection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false)
    private ResearchReport report;

    @Column(name = "section_key", nullable = false, length = 80)
    private String sectionKey;

    @Column(nullable = false, length = 250)
    private String title;

    @Column(name = "content_markdown", nullable = false, columnDefinition = "TEXT")
    private String contentMarkdown;

    @Column(name = "section_order", nullable = false)
    private int sectionOrder;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
