package com.graviton.nymbus.source.entity;

import com.graviton.nymbus.research.entity.ResearchTask;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "sources")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Source {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "research_task_id", nullable = false)
    private ResearchTask researchTask;

    @Column(columnDefinition = "TEXT")
    private String url;

    @Column(name = "canonical_url_hash", length = 64)
    private String canonicalUrlHash;

    @Column(columnDefinition = "TEXT")
    private String title;

    @Column(length = 255)
    private String domain;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 30)
    @Builder.Default
    private SourceType sourceType = SourceType.OTHER;

    @Column(length = 255)
    private String publisher;

    @Column(name = "published_at")
    private LocalDate publishedAt;

    @Column(name = "cleaned_text", columnDefinition = "TEXT")
    private String cleanedText;

    @CreationTimestamp
    @Column(name = "retrieved_at", nullable = false, updatable = false)
    private Instant retrievedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_metadata", columnDefinition = "jsonb")
    private Map<String, Object> rawMetadata;
}
