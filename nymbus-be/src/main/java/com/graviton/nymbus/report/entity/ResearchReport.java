package com.graviton.nymbus.report.entity;

import com.graviton.nymbus.research.entity.ResearchTask;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "research_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResearchReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "research_task_id", nullable = false)
    private ResearchTask researchTask;

    @Column(nullable = false)
    @Builder.Default
    private int version = 1;

    @Column(nullable = false, length = 250)
    private String title;

    @Column(name = "executive_summary", columnDefinition = "TEXT")
    private String executiveSummary;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ReportStatus status = ReportStatus.GENERATING;

    @Column(name = "content_markdown", columnDefinition = "TEXT")
    private String contentMarkdown;

    @Column(name = "generated_by_execution_id")
    private UUID generatedByExecutionId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "completed_at")
    private Instant completedAt;
}
