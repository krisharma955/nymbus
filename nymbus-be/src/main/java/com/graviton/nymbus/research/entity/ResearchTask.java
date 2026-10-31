package com.graviton.nymbus.research.entity;

import com.graviton.nymbus.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "research_tasks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResearchTask {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 250)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String prompt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TaskStatus status = TaskStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "execution_mode", nullable = false, length = 20)
    @Builder.Default
    private ExecutionMode executionMode = ExecutionMode.STANDARD;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "plan", columnDefinition = "jsonb")
    private Map<String, Object> plan;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @Column(name = "token_budget")
    private Integer tokenBudget;

    @Column(name = "tokens_used", nullable = false)
    @Builder.Default
    private int tokensUsed = 0;

    @Column(name = "cost_budget_usd", precision = 10, scale = 4)
    private BigDecimal costBudgetUsd;

    @Column(name = "cost_used_usd", nullable = false, precision = 10, scale = 4)
    @Builder.Default
    private BigDecimal costUsedUsd = BigDecimal.ZERO;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
