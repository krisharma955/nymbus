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
public class DocumentService {

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "application/pdf",
            "text/plain",
            "text/markdown"
    );

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final ResearchTaskRepository researchTaskRepository;
    private final com.graviton.nymbus.conversation.repository.ConversationRepository conversationRepository;
    private final com.graviton.nymbus.research.repository.ResearchTaskDocumentRepository researchTaskDocumentRepository;
    private final ObjectStorageService objectStorageService;
    private final DocumentProcessingService documentProcessingService;
    private final EmbeddingService embeddingService;
    private final CurrentUserService currentUserService;
    private final WorkflowEventService workflowEventService;
    private final long maxSizeBytes;

    public DocumentService(
            DocumentRepository documentRepository,
            DocumentChunkRepository documentChunkRepository,
            ResearchTaskRepository researchTaskRepository,
            com.graviton.nymbus.conversation.repository.ConversationRepository conversationRepository,
            com.graviton.nymbus.research.repository.ResearchTaskDocumentRepository researchTaskDocumentRepository,
            ObjectStorageService objectStorageService,
            DocumentProcessingService documentProcessingService,
            EmbeddingService embeddingService,
            CurrentUserService currentUserService,
            WorkflowEventService workflowEventService,
            @org.springframework.beans.factory.annotation.Value("${nymbus.documents.max-size-bytes:26214400}") long maxSizeBytes
    ) {
        this.documentRepository = documentRepository;
        this.documentChunkRepository = documentChunkRepository;
        this.researchTaskRepository = researchTaskRepository;
        this.conversationRepository = conversationRepository;
        this.researchTaskDocumentRepository = researchTaskDocumentRepository;
        this.objectStorageService = objectStorageService;
        this.documentProcessingService = documentProcessingService;
        this.embeddingService = embeddingService;
        this.currentUserService = currentUserService;
        this.workflowEventService = workflowEventService;
        this.maxSizeBytes = maxSizeBytes;
    }

    @Transactional
    public DocumentResponse uploadDocument(UUID taskId, MultipartFile file) {
        User user = currentUserService.getCurrentUser();
        ResearchTask task = researchTaskRepository.findByIdAndUserId(taskId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Research task not found with id: " + taskId));

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload empty file");
        }

        if (file.getSize() > maxSizeBytes) {
            throw new IllegalArgumentException("File size exceeds maximum allowed limit of " + maxSizeBytes + " bytes");
        }

        String rawContentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
        String normalizedContentType = rawContentType.split(";")[0].trim().toLowerCase();

        // Also check by file extension if client didn't supply specific mime
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf";
        String lowerName = originalName.toLowerCase();
        if ("application/octet-stream".equals(normalizedContentType)) {
            if (lowerName.endsWith(".pdf")) {
                normalizedContentType = "application/pdf";
            } else if (lowerName.endsWith(".txt")) {
                normalizedContentType = "text/plain";
            } else if (lowerName.endsWith(".md")) {
                normalizedContentType = "text/markdown";
            }
        }

        if (!ALLOWED_MIME_TYPES.contains(normalizedContentType)) {
            throw new IllegalArgumentException("Unsupported file type: " + rawContentType + ". Allowed types: application/pdf, text/plain, text/markdown");
        }

        try {
            byte[] fileBytes = file.getBytes();
            String checksum = computeSha256(fileBytes);

            // Sanitize filename for object key to prevent directory traversal and invalid characters
            String baseName = java.nio.file.Paths.get(originalName).getFileName().toString();
            String sanitizedFileName = baseName.replaceAll("[^a-zA-Z0-9._-]", "_");
            if (sanitizedFileName.isBlank()) {
                sanitizedFileName = "document.pdf";
            }

            String objectKey = "tasks/" + taskId + "/docs/" + UUID.randomUUID() + "-" + sanitizedFileName;

            // Upload file to Cloudflare R2 / storage
            objectStorageService.upload(objectKey, fileBytes, normalizedContentType);

            Document document = Document.builder()
                    .user(user)
                    .researchTask(task)
                    .fileName(originalName)
                    .objectKey(objectKey)
                    .contentType(normalizedContentType)
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

    @Transactional
    public DocumentResponse uploadConversationDocument(UUID conversationId, MultipartFile file) {
        User user = currentUserService.getCurrentUser();
        conversationRepository.findByIdAndUserId(conversationId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found with id: " + conversationId));

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload empty file");
        }

        if (file.getSize() > maxSizeBytes) {
            throw new IllegalArgumentException("File size exceeds maximum allowed limit of " + maxSizeBytes + " bytes");
        }

        String rawContentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
        String normalizedContentType = rawContentType.split(";")[0].trim().toLowerCase();

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf";
        String lowerName = originalName.toLowerCase();
        if ("application/octet-stream".equals(normalizedContentType)) {
            if (lowerName.endsWith(".pdf")) {
                normalizedContentType = "application/pdf";
            } else if (lowerName.endsWith(".txt")) {
                normalizedContentType = "text/plain";
            } else if (lowerName.endsWith(".md")) {
                normalizedContentType = "text/markdown";
            }
        }

        if (!ALLOWED_MIME_TYPES.contains(normalizedContentType)) {
            throw new IllegalArgumentException("Unsupported file type: " + rawContentType + ". Allowed types: application/pdf, text/plain, text/markdown");
        }

        try {
            byte[] fileBytes = file.getBytes();
            String checksum = computeSha256(fileBytes);

            // Deduplication: if same document exists in this conversation, return it
            Optional<Document> existing = documentRepository.findByConversationIdAndChecksumSha256(conversationId, checksum);
            if (existing.isPresent()) {
                log.info("Document with checksum {} already exists in conversation {}. Returning existing document.", checksum, conversationId);
                return DocumentResponse.fromEntity(existing.get());
            }

            String baseName = java.nio.file.Paths.get(originalName).getFileName().toString();
            String sanitizedFileName = baseName.replaceAll("[^a-zA-Z0-9._-]", "_");
            if (sanitizedFileName.isBlank()) {
                sanitizedFileName = "document.pdf";
            }

            String objectKey = "conversations/" + conversationId + "/docs/" + UUID.randomUUID() + "-" + sanitizedFileName;
            objectStorageService.upload(objectKey, fileBytes, normalizedContentType);

            Document document = Document.builder()
                    .user(user)
                    .conversationId(conversationId)
                    .fileName(originalName)
                    .objectKey(objectKey)
                    .contentType(normalizedContentType)
                    .fileSizeBytes(file.getSize())
                    .checksumSha256(checksum)
                    .processingStatus(DocumentProcessingStatus.UPLOADED)
                    .build();

            document = documentRepository.save(document);
            log.info("Saved conversation document {} for conversation {}", document.getId(), conversationId);

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
    public List<DocumentResponse> listConversationDocuments(UUID conversationId) {
        User user = currentUserService.getCurrentUser();
        conversationRepository.findByIdAndUserId(conversationId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found with id: " + conversationId));

        return documentRepository.findByConversationIdAndUserIdOrderByCreatedAtDesc(conversationId, user.getId())
                .stream()
                .map(DocumentResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public DocumentResponse getConversationDocumentStatus(UUID conversationId, UUID documentId) {
        User user = currentUserService.getCurrentUser();
        conversationRepository.findByIdAndUserId(conversationId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found with id: " + conversationId));

        Document doc = documentRepository.findByIdAndConversationIdAndUserId(documentId, conversationId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));

        return DocumentResponse.fromEntity(doc);
    }

    @Transactional(readOnly = true)
    public List<DocumentChunk> searchConversationChunks(UUID conversationId, String query, int limit, double maxDistance) {
        User user = currentUserService.getCurrentUser();
        int safeLimit = Math.max(1, Math.min(limit, 20));

        List<DocumentChunk> chunks = Collections.emptyList();
        try {
            float[] queryEmbedding = embeddingService.computeEmbedding(query);
            String vectorStr = embeddingService.toVectorString(queryEmbedding);
            chunks = documentChunkRepository.findSimilarChunksByConversation(
                    conversationId, user.getId(), vectorStr, maxDistance, safeLimit);
        } catch (Exception e) {
            log.warn("Vector similarity query in conversation failed: {}. Falling back to text search.", e.getMessage());
        }

        if (chunks.isEmpty()) {
            chunks = documentChunkRepository.findChunksByConversationAndTextQuery(
                    conversationId, user.getId(), query, safeLimit);
        }

        for (DocumentChunk chunk : chunks) {
            if (chunk.getDocument() != null) {
                org.hibernate.Hibernate.initialize(chunk.getDocument());
            }
        }

        return chunks;
    }

    @Transactional(readOnly = true)
    public List<DocumentChunk> searchTaskChunks(UUID taskId, String query, int limit) {
        User user = currentUserService.getCurrentUser();
        int safeLimit = Math.max(1, Math.min(limit, 20));

        boolean hasTaskDocs = !researchTaskDocumentRepository.findByResearchTaskId(taskId).isEmpty();

        List<DocumentChunk> chunks = Collections.emptyList();
        try {
            float[] queryEmbedding = embeddingService.computeEmbedding(query);
            String vectorStr = embeddingService.toVectorString(queryEmbedding);
            if (hasTaskDocs) {
                chunks = documentChunkRepository.findSimilarChunksByTaskDocuments(taskId, user.getId(), vectorStr, safeLimit);
            } else {
                chunks = documentChunkRepository.findSimilarChunks(taskId, user.getId(), vectorStr, safeLimit);
            }
        } catch (Exception e) {
            log.warn("Vector similarity query failed: {}. Falling back to text search.", e.getMessage());
        }

        if (chunks.isEmpty()) {
            if (hasTaskDocs) {
                chunks = documentChunkRepository.findChunksByTaskDocumentsAndTextQuery(taskId, user.getId(), query, safeLimit);
            } else {
                chunks = documentChunkRepository.findChunksByTextQuery(taskId, user.getId(), query, safeLimit);
            }
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
