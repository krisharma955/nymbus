package com.graviton.nymbus.research.entity;

import com.graviton.nymbus.document.entity.Document;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "research_task_documents", uniqueConstraints = {
        @UniqueConstraint(name = "ux_research_task_document", columnNames = {"research_task_id", "document_id"})
}, indexes = {
        @Index(name = "ix_task_docs_doc", columnList = "document_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResearchTaskDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "research_task_id", nullable = false)
    private ResearchTask researchTask;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
