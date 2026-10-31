package com.graviton.nymbus.document.repository;

import com.graviton.nymbus.document.entity.DocumentChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, UUID> {

    List<DocumentChunk> findByDocumentIdOrderByChunkIndexAsc(UUID documentId);

    void deleteByDocumentId(UUID documentId);

    @Modifying
    @Transactional
    @Query(value = "UPDATE document_chunks SET embedding = cast(:embedding as vector) WHERE id = :chunkId", nativeQuery = true)
    void updateEmbedding(@Param("chunkId") UUID chunkId, @Param("embedding") String embedding);

    @Query(value = """
            SELECT dc.* FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE d.research_task_id = :taskId
              AND d.user_id = :userId
              AND d.processing_status = 'READY'
            ORDER BY dc.embedding <=> cast(:embedding as vector) ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<DocumentChunk> findSimilarChunks(
            @Param("taskId") UUID taskId,
            @Param("userId") UUID userId,
            @Param("embedding") String embedding,
            @Param("limit") int limit);

    @Query(value = """
            SELECT dc.* FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE d.research_task_id = :taskId
              AND d.user_id = :userId
              AND d.processing_status = 'READY'
              AND LOWER(dc.content) LIKE LOWER(CONCAT('%', :query, '%'))
            LIMIT :limit
            """, nativeQuery = true)
    List<DocumentChunk> findChunksByTextQuery(
            @Param("taskId") UUID taskId,
            @Param("userId") UUID userId,
            @Param("query") String query,
            @Param("limit") int limit);

    @Query(value = """
            SELECT dc.* FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE d.conversation_id = :conversationId
              AND d.user_id = :userId
              AND d.processing_status = 'READY'
              AND (dc.embedding <=> cast(:embedding as vector)) <= :maxDistance
            ORDER BY dc.embedding <=> cast(:embedding as vector) ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<DocumentChunk> findSimilarChunksByConversation(
            @Param("conversationId") UUID conversationId,
            @Param("userId") UUID userId,
            @Param("embedding") String embedding,
            @Param("maxDistance") double maxDistance,
            @Param("limit") int limit);

    @Query(value = """
            SELECT dc.* FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE d.conversation_id = :conversationId
              AND d.user_id = :userId
              AND d.processing_status = 'READY'
              AND LOWER(dc.content) LIKE LOWER(CONCAT('%', :query, '%'))
            LIMIT :limit
            """, nativeQuery = true)
    List<DocumentChunk> findChunksByConversationAndTextQuery(
            @Param("conversationId") UUID conversationId,
            @Param("userId") UUID userId,
            @Param("query") String query,
            @Param("limit") int limit);

    @Query(value = """
            SELECT dc.* FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            JOIN research_task_documents rtd ON rtd.document_id = d.id
            WHERE rtd.research_task_id = :taskId
              AND d.user_id = :userId
              AND d.processing_status = 'READY'
            ORDER BY dc.embedding <=> cast(:embedding as vector) ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<DocumentChunk> findSimilarChunksByTaskDocuments(
            @Param("taskId") UUID taskId,
            @Param("userId") UUID userId,
            @Param("embedding") String embedding,
            @Param("limit") int limit);

    @Query(value = """
            SELECT dc.* FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            JOIN research_task_documents rtd ON rtd.document_id = d.id
            WHERE rtd.research_task_id = :taskId
              AND d.user_id = :userId
              AND d.processing_status = 'READY'
              AND LOWER(dc.content) LIKE LOWER(CONCAT('%', :query, '%'))
            LIMIT :limit
            """, nativeQuery = true)
    List<DocumentChunk> findChunksByTaskDocumentsAndTextQuery(
            @Param("taskId") UUID taskId,
            @Param("userId") UUID userId,
            @Param("query") String query,
            @Param("limit") int limit);
}
