package com.graviton.nymbus.agent.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "agents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Agent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 60)
    private AgentCode code;

    @Column(name = "display_name", nullable = false, length = 120)
    private String displayName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "system_prompt", columnDefinition = "TEXT")
    private String systemPrompt;

    @Column(name = "is_enabled", nullable = false)
    @Builder.Default
    private boolean isEnabled = true;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "configuration", columnDefinition = "jsonb")
    private Map<String, Object> configuration;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
