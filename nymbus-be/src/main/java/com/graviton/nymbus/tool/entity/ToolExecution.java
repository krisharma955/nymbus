package com.graviton.nymbus.tool.entity;

import com.graviton.nymbus.agent.entity.AgentExecution;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "tool_executions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ToolExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_execution_id", nullable = false)
    private AgentExecution agentExecution;

    @Column(name = "tool_name", nullable = false, length = 120)
    private String toolName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ToolExecutionStatus status = ToolExecutionStatus.STARTED;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_summary", columnDefinition = "jsonb")
    private Map<String, Object> inputSummary;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "output_summary", columnDefinition = "jsonb")
    private Map<String, Object> outputSummary;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "duration_ms")
    private Long durationMs;

    @CreationTimestamp
    @Column(name = "started_at", nullable = false, updatable = false)
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;
}
