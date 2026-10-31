package com.graviton.nymbus.research.controller;

import com.graviton.nymbus.agent.dto.ExecutionResponse;
import com.graviton.nymbus.evidence.dto.EvidenceResponse;
import com.graviton.nymbus.report.dto.ReportResponse;
import com.graviton.nymbus.research.dto.CreateTaskRequest;
import com.graviton.nymbus.research.dto.TaskResponse;
import com.graviton.nymbus.research.service.ResearchTaskService;
import com.graviton.nymbus.source.dto.SourceResponse;
import com.graviton.nymbus.workflow.dto.SubTaskResponse;
import com.graviton.nymbus.workflow.dto.WorkflowEventResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/research-tasks")
@RequiredArgsConstructor
public class ResearchTaskController {

    private final ResearchTaskService researchTaskService;

    @PostMapping
    public ResponseEntity<TaskResponse> createTask(@Valid @RequestBody CreateTaskRequest request) {
        TaskResponse response = researchTaskService.createTask(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<Page<TaskResponse>> listTasks(@PageableDefault(size = 20) Pageable pageable) {
        Page<TaskResponse> tasks = researchTaskService.listTasks(pageable);
        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/{taskId}")
    public ResponseEntity<TaskResponse> getTask(@PathVariable UUID taskId) {
        TaskResponse task = researchTaskService.getTask(taskId);
        return ResponseEntity.ok(task);
    }

    @PostMapping("/{taskId}/execute")
    public ResponseEntity<TaskResponse> executeTask(@PathVariable UUID taskId) {
        TaskResponse task = researchTaskService.executeTask(taskId);
        return ResponseEntity.ok(task);
    }

    @GetMapping("/{taskId}/subtasks")
    public ResponseEntity<List<SubTaskResponse>> getSubTasks(@PathVariable UUID taskId) {
        List<SubTaskResponse> subtasks = researchTaskService.getSubTasks(taskId);
        return ResponseEntity.ok(subtasks);
    }

    @GetMapping("/{taskId}/executions")
    public ResponseEntity<List<ExecutionResponse>> getExecutions(@PathVariable UUID taskId) {
        List<ExecutionResponse> executions = researchTaskService.getExecutions(taskId);
        return ResponseEntity.ok(executions);
    }

    @GetMapping("/{taskId}/reports")
    public ResponseEntity<List<ReportResponse>> getReports(@PathVariable UUID taskId) {
        List<ReportResponse> reports = researchTaskService.getReports(taskId);
        return ResponseEntity.ok(reports);
    }

    @GetMapping("/{taskId}/events")
    public ResponseEntity<List<WorkflowEventResponse>> getEvents(@PathVariable UUID taskId) {
        List<WorkflowEventResponse> events = researchTaskService.getEvents(taskId);
        return ResponseEntity.ok(events);
    }

    @GetMapping(value = "/{taskId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamEvents(
            @PathVariable UUID taskId,
            @RequestHeader(value = "Last-Event-ID", required = false) UUID lastEventIdHeader,
            @RequestParam(value = "lastEventId", required = false) UUID lastEventIdParam) {
        UUID lastEventId = lastEventIdHeader != null ? lastEventIdHeader : lastEventIdParam;
        return researchTaskService.streamEvents(taskId, lastEventId);
    }

    @GetMapping("/{taskId}/sources")
    public ResponseEntity<List<SourceResponse>> getSources(@PathVariable UUID taskId) {
        List<SourceResponse> sources = researchTaskService.getSources(taskId);
        return ResponseEntity.ok(sources);
    }

    @GetMapping("/{taskId}/evidence")
    public ResponseEntity<List<EvidenceResponse>> getEvidence(@PathVariable UUID taskId) {
        List<EvidenceResponse> evidence = researchTaskService.getEvidence(taskId);
        return ResponseEntity.ok(evidence);
    }
}
