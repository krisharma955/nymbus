package com.graviton.nymbus.conversation.controller;

import com.graviton.nymbus.conversation.dto.*;
import com.graviton.nymbus.conversation.service.ConversationChatService;
import com.graviton.nymbus.conversation.service.ConversationMessageService;
import com.graviton.nymbus.conversation.service.ConversationService;
import com.graviton.nymbus.document.dto.DocumentResponse;
import com.graviton.nymbus.document.service.DocumentService;
import com.graviton.nymbus.research.dto.ResearchTaskStatusResponse;
import com.graviton.nymbus.research.service.ResearchTaskService;
import com.graviton.nymbus.user.entity.User;
import com.graviton.nymbus.user.service.CurrentUserService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;
    private final ConversationMessageService conversationMessageService;
    private final ConversationChatService conversationChatService;
    private final DocumentService documentService;
    private final ResearchTaskService researchTaskService;
    private final CurrentUserService currentUserService;

    @PostMapping
    public ResponseEntity<ConversationResponse> createConversation(
            @Valid @RequestBody CreateConversationRequest request
    ) {
        ConversationResponse response = conversationService.createConversation(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<Page<ConversationResponse>> listConversations(
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(conversationService.listConversations(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConversationResponse> getConversation(@PathVariable UUID id) {
        return ResponseEntity.ok(conversationService.getConversation(id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ConversationResponse> updateConversation(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateConversationRequest request
    ) {
        return ResponseEntity.ok(conversationService.updateConversation(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteConversation(@PathVariable UUID id) {
        conversationService.deleteConversation(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<List<ConversationMessageResponse>> listMessages(
            @PathVariable UUID id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant before,
            @RequestParam(defaultValue = "50") int limit
    ) {
        return ResponseEntity.ok(conversationMessageService.listMessages(id, before, limit));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<ConversationMessageResponse> sendMessage(
            @PathVariable UUID id,
            @Valid @RequestBody SendMessageRequest request
    ) {
        User user = currentUserService.getCurrentUser();
        ConversationMessageResponse response = conversationChatService.sendMessage(id, request, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping(value = "/{id}/messages/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter sendMessageStream(
            @PathVariable UUID id,
            @Valid @RequestBody SendMessageRequest request,
            HttpServletResponse response
    ) {
        response.setHeader("Cache-Control", "no-cache, no-transform");
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Connection", "keep-alive");
        User user = currentUserService.getCurrentUser();
        return conversationChatService.sendMessageStream(id, request, user);
    }

    @PostMapping(value = "/{id}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> uploadDocument(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file
    ) {
        DocumentResponse response = documentService.uploadConversationDocument(id, file);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}/documents")
    public ResponseEntity<List<DocumentResponse>> listDocuments(@PathVariable UUID id) {
        return ResponseEntity.ok(documentService.listConversationDocuments(id));
    }

    @GetMapping("/{id}/documents/{documentId}/status")
    public ResponseEntity<DocumentResponse> getDocumentStatus(
            @PathVariable UUID id,
            @PathVariable UUID documentId
    ) {
        return ResponseEntity.ok(documentService.getConversationDocumentStatus(id, documentId));
    }

    @GetMapping("/{id}/research-tasks")
    public ResponseEntity<List<ResearchTaskStatusResponse>> listResearchTasks(@PathVariable UUID id) {
        User user = currentUserService.getCurrentUser();
        conversationService.getConversationWithOwnershipCheck(id, user);
        return ResponseEntity.ok(researchTaskService.getTasksForConversation(id, user));
    }

    @GetMapping("/{id}/research-tasks/{taskId}")
    public ResponseEntity<ResearchTaskStatusResponse> getResearchTaskStatus(
            @PathVariable UUID id,
            @PathVariable UUID taskId
    ) {
        User user = currentUserService.getCurrentUser();
        conversationService.getConversationWithOwnershipCheck(id, user);
        return ResponseEntity.ok(researchTaskService.getTaskStatus(taskId, user));
    }
}
