package com.graviton.nymbus.evidence.entity;

import com.graviton.nymbus.agent.entity.AgentExecution;
import com.graviton.nymbus.research.entity.ResearchTask;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "evidence")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Evidence {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "research_task_id", nullable = false)
    private ResearchTask researchTask;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_execution_id", nullable = false)
    private AgentExecution createdByExecution;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String claim;

    @Column(name = "supporting_passage", columnDefinition = "TEXT")
    private String supportingPassage;

    @Column(name = "claim_type", length = 60)
    private String claimType;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 20)
    @Builder.Default
    private VerificationStatus verificationStatus = VerificationStatus.NOT_VERIFIED;

    @Column(name = "confidence_score", precision = 4, scale = 3)
    private BigDecimal confidenceScore;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
