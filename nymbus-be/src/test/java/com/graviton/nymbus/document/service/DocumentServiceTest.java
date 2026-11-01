package com.graviton.nymbus.document.service;

import com.graviton.nymbus.conversation.repository.ConversationRepository;
import com.graviton.nymbus.document.repository.DocumentChunkRepository;
import com.graviton.nymbus.document.repository.DocumentRepository;
import com.graviton.nymbus.document.storage.ObjectStorageService;
import com.graviton.nymbus.research.repository.ResearchTaskDocumentRepository;
import com.graviton.nymbus.research.repository.ResearchTaskRepository;
import com.graviton.nymbus.user.service.CurrentUserService;
import com.graviton.nymbus.workflow.service.WorkflowEventService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class DocumentServiceTest {

    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private DocumentChunkRepository documentChunkRepository;
    @Mock
    private ResearchTaskRepository researchTaskRepository;
    @Mock
    private ConversationRepository conversationRepository;
    @Mock
    private ResearchTaskDocumentRepository researchTaskDocumentRepository;
    @Mock
    private ObjectStorageService objectStorageService;
    @Mock
    private DocumentProcessingService documentProcessingService;
    @Mock
    private EmbeddingService embeddingService;
    @Mock
    private CurrentUserService currentUserService;
    @Mock
    private WorkflowEventService workflowEventService;

    private DocumentService documentService;

    @BeforeEach
    void setUp() {
        documentService = new DocumentService(
                documentRepository,
                documentChunkRepository,
                researchTaskRepository,
                conversationRepository,
                researchTaskDocumentRepository,
                objectStorageService,
                documentProcessingService,
                embeddingService,
                currentUserService,
                workflowEventService,
                10_000_000L
        );
    }

    @Test
    void determineAndValidateContentType_AcceptsSupportedFormats() {
        assertEquals("text/csv",
                documentService.determineAndValidateContentType("text/csv", "data.csv"));
        assertEquals("text/csv",
                documentService.determineAndValidateContentType("application/vnd.ms-excel", "report.csv"));
        assertEquals("application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                documentService.determineAndValidateContentType("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "proposal.docx"));
        assertEquals("application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                documentService.determineAndValidateContentType("application/octet-stream", "proposal.docx"));
        assertEquals("application/pdf",
                documentService.determineAndValidateContentType("application/pdf", "whitepaper.pdf"));
        assertEquals("text/plain",
                documentService.determineAndValidateContentType("text/plain", "notes.txt"));
        assertEquals("text/markdown",
                documentService.determineAndValidateContentType("text/markdown", "readme.md"));
    }

    @Test
    void determineAndValidateContentType_RejectsUnsupportedFormats() {
        IllegalArgumentException ex1 = assertThrows(IllegalArgumentException.class, () ->
                documentService.determineAndValidateContentType("application/zip", "archive.zip"));
        assertTrue(ex1.getMessage().contains("Unsupported file type"));

        IllegalArgumentException ex2 = assertThrows(IllegalArgumentException.class, () ->
                documentService.determineAndValidateContentType("application/x-msdownload", "virus.exe"));
        assertTrue(ex2.getMessage().contains("Unsupported file type"));
    }
}
