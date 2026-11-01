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
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.ai.reader.pdf.PagePdfDocumentReader;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
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

    @Async("documentExecutor")
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
                    document.getResearchTask() != null ? document.getResearchTask().getId() : null
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

            if (docInfo.taskId() != null) {
                workflowEventService.recordEvent(
                        docInfo.taskId(),
                        null,
                        null,
                        WorkflowEventType.DOCUMENT_PROCESSED,
                        "Document processed: " + docInfo.fileName() + " (" + chunksToPersist.size() + " chunks indexed)",
                        Map.of("documentId", docInfo.id(), "chunksCount", chunksToPersist.size())
                );
            }

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
        if (data == null || data.length == 0) {
            throw new IllegalArgumentException("Cannot extract text from empty document: " + fileName);
        }

        String lowerType = contentType != null ? contentType.toLowerCase(Locale.ROOT) : "";
        String lowerName = fileName != null ? fileName.toLowerCase(Locale.ROOT) : "";

        boolean isPdf = lowerType.contains("pdf") || lowerName.endsWith(".pdf");
        boolean isCsv = lowerType.contains("csv") || lowerType.contains("comma-separated")
                || lowerType.contains("vnd.ms-excel") || lowerName.endsWith(".csv");
        boolean isDocx = lowerType.contains("wordprocessingml") || lowerType.contains("docx")
                || lowerType.contains("tika-ooxml") || lowerName.endsWith(".docx");

        if (isPdf) {
            return extractPdfPages(fileName, data);
        } else if (isCsv) {
            return extractCsvPages(fileName, data);
        } else if (isDocx) {
            return extractDocxPages(fileName, data);
        }

        // Plain text / Markdown fallback
        String text = new String(data, StandardCharsets.UTF_8);
        return List.of(new ExtractedPage(1, text));
    }

    private List<ExtractedPage> extractPdfPages(String fileName, byte[] data) {
        // PDF Magic Bytes Validation (%PDF)
        if (data.length < 4 || data[0] != 0x25 || data[1] != 0x50 || data[2] != 0x44 || data[3] != 0x46) {
            throw new IllegalArgumentException("Invalid PDF format: missing '%PDF-' magic header");
        }

        try {
            PagePdfDocumentReader reader = new PagePdfDocumentReader(new ByteArrayResource(data));
            List<org.springframework.ai.document.Document> docs = reader.get();
            if (docs == null || docs.isEmpty()) {
                throw new IllegalStateException("PDF document reader extracted zero pages from " + fileName);
            }
            List<ExtractedPage> pages = new ArrayList<>();
            for (int i = 0; i < docs.size(); i++) {
                org.springframework.ai.document.Document doc = docs.get(i);
                Object pageMeta = doc.getMetadata().get("page_number");
                int pageNum = pageMeta instanceof Integer p ? p : (i + 1);
                pages.add(new ExtractedPage(pageNum, doc.getText()));
            }
            return pages;
        } catch (Exception e) {
            log.error("PDF extraction failed for {}: {}", fileName, e.getMessage());
            throw new IllegalStateException("Failed to parse and extract text from PDF: " + e.getMessage(), e);
        }
    }

    private List<ExtractedPage> extractCsvPages(String fileName, byte[] data) {
        List<ExtractedPage> pages = new ArrayList<>();
        try (Reader reader = new InputStreamReader(new ByteArrayInputStream(data), StandardCharsets.UTF_8)) {
            CSVParser parser = CSVFormat.DEFAULT.builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .setIgnoreEmptyLines(true)
                    .setTrim(true)
                    .build()
                    .parse(reader);

            List<String> headers = parser.getHeaderNames();
            List<CSVRecord> records = parser.getRecords();

            if (records.isEmpty()) {
                // Fallback attempt without header
                try (Reader r2 = new InputStreamReader(new ByteArrayInputStream(data), StandardCharsets.UTF_8)) {
                    CSVParser fallbackParser = CSVFormat.DEFAULT.builder()
                            .setIgnoreEmptyLines(true)
                            .setTrim(true)
                            .build()
                            .parse(r2);
                    records = fallbackParser.getRecords();
                    headers = Collections.emptyList();
                }
            }

            if (records.isEmpty()) {
                throw new IllegalStateException("CSV file contains zero records: " + fileName);
            }

            StringBuilder pageSb = new StringBuilder();
            int pageNumber = 1;
            int rowsOnPage = 0;

            for (int r = 0; r < records.size(); r++) {
                CSVRecord record = records.get(r);
                StringBuilder rowSb = new StringBuilder();
                rowSb.append("Row ").append(r + 1).append(": ");

                boolean hasValue = false;
                for (int c = 0; c < record.size(); c++) {
                    String val = record.get(c);
                    if (val != null && !val.isBlank()) {
                        hasValue = true;
                        String header = (c < headers.size() && !headers.get(c).isBlank())
                                ? headers.get(c)
                                : "Column_" + (c + 1);
                        rowSb.append(header).append(": ").append(val.trim()).append(" | ");
                    }
                }

                if (hasValue) {
                    if (rowSb.length() >= 3 && rowSb.substring(rowSb.length() - 3).equals(" | ")) {
                        rowSb.setLength(rowSb.length() - 3);
                    }
                    pageSb.append(rowSb).append("\n");
                    rowsOnPage++;

                    if (pageSb.length() > 2000 || rowsOnPage >= 50) {
                        pages.add(new ExtractedPage(pageNumber++, pageSb.toString().trim()));
                        pageSb = new StringBuilder();
                        rowsOnPage = 0;
                    }
                }
            }

            if (pageSb.length() > 0) {
                pages.add(new ExtractedPage(pageNumber, pageSb.toString().trim()));
            }

            if (pages.isEmpty()) {
                throw new IllegalStateException("CSV file contains no valid text records: " + fileName);
            }

            log.info("CSV extraction succeeded for {}: {} records parsed across {} page sections",
                    fileName, records.size(), pages.size());
            return pages;
        } catch (Exception e) {
            log.error("CSV extraction failed for {}: {}", fileName, e.getMessage());
            throw new IllegalStateException("Failed to parse and extract text from CSV: " + e.getMessage(), e);
        }
    }

    private List<ExtractedPage> extractDocxPages(String fileName, byte[] data) {
        // PK Zip Magic Header Check (0x50 0x4B 0x03 0x04)
        if (data.length < 4 || data[0] != 0x50 || data[1] != 0x4B) {
            throw new IllegalArgumentException("Invalid DOCX format: missing PK zip header");
        }

        List<ExtractedPage> pages = new ArrayList<>();
        try (ByteArrayInputStream bis = new ByteArrayInputStream(data);
             XWPFDocument doc = new XWPFDocument(bis)) {

            StringBuilder pageSb = new StringBuilder();
            int pageNumber = 1;

            // 1. Extract paragraphs & headings
            for (XWPFParagraph p : doc.getParagraphs()) {
                String text = p.getText();
                if (text == null || text.isBlank()) {
                    continue;
                }
                pageSb.append(text.trim()).append("\n\n");

                if (pageSb.length() > 2000) {
                    pages.add(new ExtractedPage(pageNumber++, pageSb.toString().trim()));
                    pageSb = new StringBuilder();
                }
            }

            // 2. Extract tables
            for (XWPFTable table : doc.getTables()) {
                StringBuilder tableSb = new StringBuilder("\n### Table:\n");
                for (XWPFTableRow row : table.getRows()) {
                    tableSb.append("| ");
                    for (XWPFTableCell cell : row.getTableCells()) {
                        String cellText = cell.getText() != null ? cell.getText().replaceAll("[\\r\\n]+", " ").trim() : "";
                        tableSb.append(cellText).append(" | ");
                    }
                    tableSb.append("\n");
                }
                tableSb.append("\n");
                pageSb.append(tableSb);

                if (pageSb.length() > 2000) {
                    pages.add(new ExtractedPage(pageNumber++, pageSb.toString().trim()));
                    pageSb = new StringBuilder();
                }
            }

            if (pageSb.length() > 0) {
                pages.add(new ExtractedPage(pageNumber, pageSb.toString().trim()));
            }

            if (pages.isEmpty()) {
                throw new IllegalStateException("DOCX document reader extracted zero text from " + fileName);
            }

            log.info("DOCX extraction succeeded for {}: {} sections extracted", fileName, pages.size());
            return pages;
        } catch (Exception e) {
            log.error("DOCX extraction failed for {}: {}", fileName, e.getMessage());
            throw new IllegalStateException("Failed to parse and extract text from DOCX: " + e.getMessage(), e);
        }
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
