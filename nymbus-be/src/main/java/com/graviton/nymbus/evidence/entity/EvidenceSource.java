package com.graviton.nymbus.evidence.entity;

import com.graviton.nymbus.document.entity.DocumentChunk;
import com.graviton.nymbus.source.entity.Source;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "evidence_sources", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"evidence_id", "source_id", "support_type"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EvidenceSource {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evidence_id", nullable = false)
    private Evidence evidence;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_id", nullable = false)
    private Source source;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_chunk_id")
    private DocumentChunk documentChunk;

    @Column(name = "source_locator", columnDefinition = "TEXT")
    private String sourceLocator;

    @Enumerated(EnumType.STRING)
    @Column(name = "support_type", nullable = false, length = 20)
    private SupportType supportType;

    @Column(name = "relevant_passage", columnDefinition = "TEXT")
    private String relevantPassage;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
