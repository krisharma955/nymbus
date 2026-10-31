package com.graviton.nymbus.document.service;

import com.graviton.nymbus.document.entity.Document;
import com.graviton.nymbus.document.entity.DocumentChunk;
import com.graviton.nymbus.document.entity.DocumentProcessingStatus;
import com.graviton.nymbus.document.repository.DocumentChunkRepository;
import com.graviton.nymbus.document.repository.DocumentRepository;
import com.graviton.nymbus.document.storage.ObjectStorageService;
import com.graviton.nymbus.workflow.entity.WorkflowEventType;
import com.graviton.nymbus.workflow.service.WorkflowEventService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.reader.pdf.PagePdfDocumentReader;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
public class DocumentProcessingService {

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final ObjectStorageService objectStorageService;
    private final EmbeddingService embeddingService;
    private final WorkflowEventService workflowEventService;
    private final TransactionTemplate transactionTemplate;

    public DocumentProcessingService(
            DocumentRepository documentRepository,
            DocumentChunkRepository documentChunkRepository,
            ObjectStorageService objectStorageService,
            EmbeddingService embeddingService,
            WorkflowEventService workflowEventService,
            PlatformTransactionManager transactionManager
    ) {
        this.documentRepository = documentRepository;
        this.documentChunkRepository = documentChunkRepository;
        this.objectStorageService = objectStorageService;
        this.embeddingService = embeddingService;
        this.workflowEventService = workflowEventService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Async
    public void processDocumentAsync(UUID documentId) {
        log.info("Starting asynchronous processing for document {}", documentId);

        // Step 1: Mark PROCESSING in a short transaction and read metadata
        DocumentInfo docInfo = transactionTemplate.execute(status -> {
            Optional<Document> optDoc = documentRepository.findById(documentId);
            if (optDoc.isEmpty()) {
                return null;
            }
            Document document = optDoc.get();
            document.setProcessingStatus(DocumentProcessingStatus.PROCESSING);
            document.setProcessingError(null);
            documentRepository.save(document);
            return new DocumentInfo(
                    document.getId(),
                    document.getFileName(),
                    document.getContentType(),
                    document.getObjectKey(),
                    document.getResearchTask().getId()
            );
        });

        if (docInfo == null) {
            log.error("Document {} not found for processing", documentId);
            return;
        }

        try {
            // Step 2: External I/O (R2 download, text extraction, chunking, embeddings) OUTSIDE transaction
            byte[] fileBytes = objectStorageService.download(docInfo.objectKey());
            List<ExtractedPage> pages = extractPages(docInfo.fileName(), docInfo.contentType(), fileBytes);

            List<ChunkData> chunksToPersist = new ArrayList<>();
            int chunkIndex = 0;
            for (ExtractedPage page : pages) {
                List<String> pageChunks = chunkText(page.content(), 800, 100);
                for (String chunkContent : pageChunks) {
                    if (chunkContent.isBlank()) continue;

                    int tokenCount = Math.max(1, chunkContent.length() / 4);
                    float[] embedding = embeddingService.computeEmbedding(chunkContent);
                    String vectorStr = embeddingService.toVectorString(embedding);

                    chunksToPersist.add(new ChunkData(
                            chunkIndex++,
                            chunkContent,
                            page.pageNumber(),
                            tokenCount,
                            vectorStr
                    ));
                }
            }

            // Step 3: Save chunks and update document status in a short transaction
            transactionTemplate.executeWithoutResult(status -> {
                Document document = documentRepository.findById(documentId).orElseThrow();
                for (ChunkData cd : chunksToPersist) {
                    DocumentChunk chunk = DocumentChunk.builder()
                            .document(document)
                            .chunkIndex(cd.chunkIndex())
                            .content(cd.content())
                            .pageNumber(cd.pageNumber())
                            .tokenCount(cd.tokenCount())
                            .metadata(Map.of(
                                    "fileName", document.getFileName(),
                                    "pageNumber", cd.pageNumber() != null ? cd.pageNumber() : 1
                            ))
                            .build();

                    chunk = documentChunkRepository.save(chunk);
                    documentChunkRepository.updateEmbedding(chunk.getId(), cd.vectorStr());
                }

                document.setProcessingStatus(DocumentProcessingStatus.READY);
                document.setProcessedAt(Instant.now());
                documentRepository.save(document);
            });

            log.info("Document {} successfully processed into {} chunks", documentId, chunksToPersist.size());

            workflowEventService.recordEvent(
                    docInfo.taskId(),
                    null,
                    null,
                    WorkflowEventType.DOCUMENT_PROCESSED,
                    "Document processed: " + docInfo.fileName() + " (" + chunksToPersist.size() + " chunks indexed)",
                    Map.of("documentId", docInfo.id(), "chunksCount", chunksToPersist.size())
            );

        } catch (Exception e) {
            log.error("Failed to process document {}: {}", documentId, e.getMessage(), e);
            // Step 4: Mark FAILED in a short transaction
            transactionTemplate.executeWithoutResult(status -> {
                documentRepository.findById(documentId).ifPresent(document -> {
                    document.setProcessingStatus(DocumentProcessingStatus.FAILED);
                    document.setProcessingError(e.getMessage());
                    documentRepository.save(document);
                });
            });
        }
    }

    private List<ExtractedPage> extractPages(String fileName, String contentType, byte[] data) {
        List<ExtractedPage> pages = new ArrayList<>();
        boolean isPdf = (contentType != null && contentType.toLowerCase().contains("pdf"))
                || (fileName != null && fileName.toLowerCase().endsWith(".pdf"));

        if (isPdf) {
            try {
                PagePdfDocumentReader reader = new PagePdfDocumentReader(new ByteArrayResource(data));
                List<org.springframework.ai.document.Document> docs = reader.get();
                for (int i = 0; i < docs.size(); i++) {
                    org.springframework.ai.document.Document doc = docs.get(i);
                    Object pageMeta = doc.getMetadata().get("page_number");
                    int pageNum = pageMeta instanceof Integer p ? p : (i + 1);
                    pages.add(new ExtractedPage(pageNum, doc.getText()));
                }
                return pages;
            } catch (Exception e) {
                log.warn("PagePdfDocumentReader failed for {}: {}. Falling back to plain text extraction.", fileName, e.getMessage());
            }
        }

        // Plain text / Markdown fallback
        String text = new String(data, java.nio.charset.StandardCharsets.UTF_8);
        pages.add(new ExtractedPage(1, text));
        return pages;
    }

    private List<String> chunkText(String text, int targetChars, int overlapChars) {
        List<String> chunks = new ArrayList<>();
        if (text == null || text.isBlank()) {
            return chunks;
        }

        String cleaned = text.replaceAll("\\r\\n", "\n").trim();
        int length = cleaned.length();
        if (length <= targetChars) {
            chunks.add(cleaned);
            return chunks;
        }

        int start = 0;
        while (start < length) {
            int end = Math.min(start + targetChars, length);
            if (end < length) {
                int lastPeriod = cleaned.lastIndexOf(". ", end);
                int lastNewline = cleaned.lastIndexOf("\n", end);
                int breakPoint = Math.max(lastPeriod, lastNewline);
                if (breakPoint > start + (targetChars / 2)) {
                    end = breakPoint + 1;
                }
            }
            String chunk = cleaned.substring(start, end).trim();
            if (!chunk.isBlank()) {
                chunks.add(chunk);
            }
            if (end >= length) break;
            start = Math.max(start + 1, end - overlapChars);
        }

        return chunks;
    }

    private record DocumentInfo(UUID id, String fileName, String contentType, String objectKey, UUID taskId) {}

    private record ChunkData(int chunkIndex, String content, Integer pageNumber, int tokenCount, String vectorStr) {}

    private record ExtractedPage(int pageNumber, String content) {}
}
