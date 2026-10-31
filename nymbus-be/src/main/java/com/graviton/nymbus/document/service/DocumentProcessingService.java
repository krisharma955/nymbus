package com.graviton.nymbus.document.service;

import com.graviton.nymbus.document.entity.Document;
import com.graviton.nymbus.document.entity.DocumentChunk;
import com.graviton.nymbus.document.entity.DocumentProcessingStatus;
import com.graviton.nymbus.document.repository.DocumentChunkRepository;
import com.graviton.nymbus.document.repository.DocumentRepository;
import com.graviton.nymbus.document.storage.ObjectStorageService;
import com.graviton.nymbus.workflow.entity.WorkflowEventType;
import com.graviton.nymbus.workflow.service.WorkflowEventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.reader.pdf.PagePdfDocumentReader;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentProcessingService {

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final ObjectStorageService objectStorageService;
    private final EmbeddingService embeddingService;
    private final WorkflowEventService workflowEventService;

    @Async
    @Transactional
    public void processDocumentAsync(UUID documentId) {
        log.info("Starting asynchronous processing for document {}", documentId);
        Optional<Document> optDoc = documentRepository.findById(documentId);
        if (optDoc.isEmpty()) {
            log.error("Document {} not found for processing", documentId);
            return;
        }

        Document document = optDoc.get();
        document.setProcessingStatus(DocumentProcessingStatus.PROCESSING);
        documentRepository.save(document);

        try {
            byte[] fileBytes = objectStorageService.download(document.getObjectKey());
            List<ExtractedPage> pages = extractPages(document.getFileName(), document.getContentType(), fileBytes);

            int chunkIndex = 0;
            for (ExtractedPage page : pages) {
                List<String> pageChunks = chunkText(page.content(), 800, 100);
                for (String chunkContent : pageChunks) {
                    if (chunkContent.isBlank()) continue;

                    int tokenCount = Math.max(1, chunkContent.length() / 4);
                    DocumentChunk chunk = DocumentChunk.builder()
                            .document(document)
                            .chunkIndex(chunkIndex++)
                            .content(chunkContent)
                            .pageNumber(page.pageNumber())
                            .tokenCount(tokenCount)
                            .metadata(Map.of(
                                    "fileName", document.getFileName(),
                                    "pageNumber", page.pageNumber()
                            ))
                            .build();

                    chunk = documentChunkRepository.save(chunk);

                    // Compute vector embedding and persist into VECTOR(1536) column
                    float[] embedding = embeddingService.computeEmbedding(chunkContent);
                    String vectorStr = embeddingService.toVectorString(embedding);
                    documentChunkRepository.updateEmbedding(chunk.getId(), vectorStr);
                }
            }

            document.setProcessingStatus(DocumentProcessingStatus.READY);
            document.setProcessedAt(Instant.now());
            documentRepository.save(document);
            log.info("Document {} successfully processed into {} chunks", documentId, chunkIndex);

            workflowEventService.recordEvent(
                    document.getResearchTask().getId(),
                    null,
                    null,
                    WorkflowEventType.DOCUMENT_PROCESSED,
                    "Document processed: " + document.getFileName() + " (" + chunkIndex + " chunks indexed)",
                    Map.of("documentId", document.getId(), "chunksCount", chunkIndex)
            );

        } catch (Exception e) {
            log.error("Failed to process document {}: {}", documentId, e.getMessage(), e);
            document.setProcessingStatus(DocumentProcessingStatus.FAILED);
            document.setProcessingError(e.getMessage());
            documentRepository.save(document);
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
            // Try to split on sentence or paragraph boundary if possible
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

    private record ExtractedPage(int pageNumber, String content) {}
}
