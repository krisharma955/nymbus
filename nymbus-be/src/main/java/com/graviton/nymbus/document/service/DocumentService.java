package com.graviton.nymbus.document.service;

import com.graviton.nymbus.common.exception.ResourceNotFoundException;
import com.graviton.nymbus.document.dto.DocumentChunkResponse;
import com.graviton.nymbus.document.dto.DocumentResponse;
import com.graviton.nymbus.document.entity.Document;
import com.graviton.nymbus.document.entity.DocumentChunk;
import com.graviton.nymbus.document.entity.DocumentProcessingStatus;
import com.graviton.nymbus.document.repository.DocumentChunkRepository;
import com.graviton.nymbus.document.repository.DocumentRepository;
import com.graviton.nymbus.document.storage.ObjectStorageService;
import com.graviton.nymbus.research.entity.ResearchTask;
import com.graviton.nymbus.research.repository.ResearchTaskRepository;
import com.graviton.nymbus.source.service.CanonicalUrlService;
import com.graviton.nymbus.user.entity.User;
import com.graviton.nymbus.user.service.CurrentUserService;
import com.graviton.nymbus.workflow.entity.WorkflowEventType;
import com.graviton.nymbus.workflow.service.WorkflowEventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.MessageDigest;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final ResearchTaskRepository researchTaskRepository;
    private final ObjectStorageService objectStorageService;
    private final DocumentProcessingService documentProcessingService;
    private final EmbeddingService embeddingService;
    private final CurrentUserService currentUserService;
    private final WorkflowEventService workflowEventService;

    @Transactional
    public DocumentResponse uploadDocument(UUID taskId, MultipartFile file) {
        User user = currentUserService.getCurrentUser();
        ResearchTask task = researchTaskRepository.findByIdAndUserId(taskId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Research task not found with id: " + taskId));

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload empty file");
        }

        try {
            byte[] fileBytes = file.getBytes();
            String checksum = computeSha256(fileBytes);
            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf";
            String contentType = file.getContentType() != null ? file.getContentType() : "application/pdf";
            String objectKey = "tasks/" + taskId + "/docs/" + UUID.randomUUID() + "-" + originalName;

            // Upload file to Cloudflare R2 / storage
            objectStorageService.upload(objectKey, fileBytes, contentType);

            Document document = Document.builder()
                    .user(user)
                    .researchTask(task)
                    .fileName(originalName)
                    .objectKey(objectKey)
                    .contentType(contentType)
                    .fileSizeBytes(file.getSize())
                    .checksumSha256(checksum)
                    .processingStatus(DocumentProcessingStatus.UPLOADED)
                    .build();

            document = documentRepository.save(document);
            log.info("Saved Document record {} for task {}", document.getId(), taskId);

            workflowEventService.recordEvent(
                    taskId,
                    null,
                    null,
                    WorkflowEventType.DOCUMENT_UPLOADED,
                    "Document uploaded: " + originalName + " (" + (file.getSize() / 1024) + " KB)",
                    Map.of("documentId", document.getId(), "fileName", originalName, "sizeBytes", file.getSize())
            );

            // Trigger async text extraction and vector embedding after transaction commit
            UUID docId = document.getId();
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        documentProcessingService.processDocumentAsync(docId);
                    }
                });
            } else {
                documentProcessingService.processDocumentAsync(docId);
            }

            return DocumentResponse.fromEntity(document);

        } catch (IOException e) {
            throw new RuntimeException("Failed to read uploaded file", e);
        }
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> listDocuments(UUID taskId) {
        User user = currentUserService.getCurrentUser();
        researchTaskRepository.findByIdAndUserId(taskId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Research task not found with id: " + taskId));

        return documentRepository.findByResearchTaskIdAndUserIdOrderByCreatedAtDesc(taskId, user.getId())
                .stream()
                .map(DocumentResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DocumentChunkResponse> getChunksForDocument(UUID taskId, UUID documentId) {
        User user = currentUserService.getCurrentUser();
        researchTaskRepository.findByIdAndUserId(taskId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Research task not found with id: " + taskId));

        Document doc = documentRepository.findByIdAndUserId(documentId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));

        return documentChunkRepository.findByDocumentIdOrderByChunkIndexAsc(doc.getId())
                .stream()
                .map(DocumentChunkResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DocumentChunk> searchTaskChunks(UUID taskId, String query, int limit) {
        User user = currentUserService.getCurrentUser();
        int safeLimit = Math.max(1, Math.min(limit, 20));

        List<DocumentChunk> chunks = Collections.emptyList();
        try {
            float[] queryEmbedding = embeddingService.computeEmbedding(query);
            String vectorStr = embeddingService.toVectorString(queryEmbedding);
            chunks = documentChunkRepository.findSimilarChunks(taskId, user.getId(), vectorStr, safeLimit);
        } catch (Exception e) {
            log.warn("Vector similarity query failed: {}. Falling back to text search.", e.getMessage());
        }

        if (chunks.isEmpty()) {
            chunks = documentChunkRepository.findChunksByTextQuery(taskId, user.getId(), query, safeLimit);
        }

        for (DocumentChunk chunk : chunks) {
            if (chunk.getDocument() != null) {
                org.hibernate.Hibernate.initialize(chunk.getDocument());
            }
        }

        return chunks;
    }

    private String computeSha256(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(data));
        } catch (Exception e) {
            return null;
        }
    }
}
