package com.graviton.nymbus.document.service;

import com.graviton.nymbus.document.entity.Document;
import com.graviton.nymbus.document.entity.DocumentChunk;
import com.graviton.nymbus.document.entity.DocumentProcessingStatus;
import com.graviton.nymbus.document.repository.DocumentChunkRepository;
import com.graviton.nymbus.document.repository.DocumentRepository;
import com.graviton.nymbus.document.storage.ObjectStorageService;
import com.graviton.nymbus.workflow.service.WorkflowEventService;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentProcessingServiceTest {

    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private DocumentChunkRepository documentChunkRepository;
    @Mock
    private ObjectStorageService objectStorageService;
    @Mock
    private EmbeddingService embeddingService;
    @Mock
    private WorkflowEventService workflowEventService;
    @Mock
    private PlatformTransactionManager transactionManager;

    private DocumentProcessingService processingService;

    @BeforeEach
    void setUp() {
        TransactionStatus dummyStatus = mock(TransactionStatus.class);
        lenient().when(transactionManager.getTransaction(any())).thenReturn(dummyStatus);

        processingService = new DocumentProcessingService(
                documentRepository,
                documentChunkRepository,
                objectStorageService,
                embeddingService,
                workflowEventService,
                transactionManager
        );

        lenient().when(embeddingService.computeEmbedding(anyString())).thenReturn(new float[1536]);
        lenient().when(embeddingService.toVectorString(any())).thenReturn("[0.0,0.0]");
        lenient().when(documentChunkRepository.save(any(DocumentChunk.class))).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void processDocumentAsync_ProcessesCsvSuccessfully() {
        UUID docId = UUID.randomUUID();
        Document doc = Document.builder()
                .id(docId)
                .fileName("missions.csv")
                .contentType("text/csv")
                .objectKey("tasks/test/docs/missions.csv")
                .processingStatus(DocumentProcessingStatus.UPLOADED)
                .build();

        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));

        String csvData = """
                Rocket,Stage,ReuseCount,Notes
                Falcon 9,1,15,"Landed at Port Canaveral, FL"
                Starship,Super Heavy,3,"High-altitude capture"
                """;

        when(objectStorageService.download("tasks/test/docs/missions.csv"))
                .thenReturn(csvData.getBytes(StandardCharsets.UTF_8));

        processingService.processDocumentAsync(docId);

        assertEquals(DocumentProcessingStatus.READY, doc.getProcessingStatus());
        assertNotNull(doc.getProcessedAt());

        ArgumentCaptor<DocumentChunk> chunkCaptor = ArgumentCaptor.forClass(DocumentChunk.class);
        verify(documentChunkRepository, atLeastOnce()).save(chunkCaptor.capture());

        boolean foundFalcon = chunkCaptor.getAllValues().stream()
                .anyMatch(c -> c.getContent().contains("Falcon 9") && c.getContent().contains("Landed at Port Canaveral, FL"));
        assertTrue(foundFalcon, "CSV chunk should preserve quoted comma text and column headers");
    }

    @Test
    void processDocumentAsync_ProcessesDocxSuccessfully() throws Exception {
        UUID docId = UUID.randomUUID();
        Document doc = Document.builder()
                .id(docId)
                .fileName("overview.docx")
                .contentType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                .objectKey("tasks/test/docs/overview.docx")
                .processingStatus(DocumentProcessingStatus.UPLOADED)
                .build();

        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));

        // Create an in-memory valid DOCX
        byte[] docxBytes;
        try (XWPFDocument xwpf = new XWPFDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XWPFParagraph p = xwpf.createParagraph();
            p.createRun().setText("Autonomous Rocket Guidance Overview: Systems achieve high accuracy.");

            XWPFTable table = xwpf.createTable(2, 2);
            table.getRow(0).getCell(0).setText("Parameter");
            table.getRow(0).getCell(1).setText("Value");
            table.getRow(1).getCell(0).setText("Burn Time");
            table.getRow(1).getCell(1).setText("162 seconds");

            xwpf.write(out);
            docxBytes = out.toByteArray();
        }

        when(objectStorageService.download("tasks/test/docs/overview.docx")).thenReturn(docxBytes);

        processingService.processDocumentAsync(docId);

        assertEquals(DocumentProcessingStatus.READY, doc.getProcessingStatus());
        assertNotNull(doc.getProcessedAt());

        ArgumentCaptor<DocumentChunk> chunkCaptor = ArgumentCaptor.forClass(DocumentChunk.class);
        verify(documentChunkRepository, atLeastOnce()).save(chunkCaptor.capture());

        boolean foundParagraph = chunkCaptor.getAllValues().stream()
                .anyMatch(c -> c.getContent().contains("Autonomous Rocket Guidance Overview"));
        assertTrue(foundParagraph);

        boolean foundTable = chunkCaptor.getAllValues().stream()
                .anyMatch(c -> c.getContent().contains("162 seconds"));
        assertTrue(foundTable);
    }

    @Test
    void processDocumentAsync_MalformedDocxFailsGracefully() {
        UUID docId = UUID.randomUUID();
        Document doc = Document.builder()
                .id(docId)
                .fileName("corrupt.docx")
                .contentType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                .objectKey("tasks/test/docs/corrupt.docx")
                .processingStatus(DocumentProcessingStatus.UPLOADED)
                .build();

        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));
        // Not a PK zip file
        when(objectStorageService.download("tasks/test/docs/corrupt.docx"))
                .thenReturn("Not a zip file".getBytes(StandardCharsets.UTF_8));

        processingService.processDocumentAsync(docId);

        assertEquals(DocumentProcessingStatus.FAILED, doc.getProcessingStatus());
        assertNotNull(doc.getProcessingError());
        assertTrue(doc.getProcessingError().contains("Invalid DOCX format"));
    }

    @Test
    void processDocumentAsync_ProcessesPlainTextSuccessfully() {
        UUID docId = UUID.randomUUID();
        Document doc = Document.builder()
                .id(docId)
                .fileName("notes.txt")
                .contentType("text/plain")
                .objectKey("tasks/test/docs/notes.txt")
                .processingStatus(DocumentProcessingStatus.UPLOADED)
                .build();

        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(objectStorageService.download("tasks/test/docs/notes.txt"))
                .thenReturn("Simple plain text notes for testing.".getBytes(StandardCharsets.UTF_8));

        processingService.processDocumentAsync(docId);

        assertEquals(DocumentProcessingStatus.READY, doc.getProcessingStatus());
        assertNotNull(doc.getProcessedAt());
    }
}
