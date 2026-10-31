package com.graviton.nymbus.document.controller;

import com.graviton.nymbus.document.dto.DocumentChunkResponse;
import com.graviton.nymbus.document.dto.DocumentResponse;
import com.graviton.nymbus.document.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/research-tasks/{taskId}/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> uploadDocument(
            @PathVariable UUID taskId,
            @RequestParam("file") MultipartFile file) {
        DocumentResponse response = documentService.uploadDocument(taskId, file);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<DocumentResponse>> listDocuments(@PathVariable UUID taskId) {
        List<DocumentResponse> documents = documentService.listDocuments(taskId);
        return ResponseEntity.ok(documents);
    }

    @GetMapping("/{documentId}/chunks")
    public ResponseEntity<List<DocumentChunkResponse>> getChunks(
            @PathVariable UUID taskId,
            @PathVariable UUID documentId) {
        List<DocumentChunkResponse> chunks = documentService.getChunksForDocument(taskId, documentId);
        return ResponseEntity.ok(chunks);
    }
}
