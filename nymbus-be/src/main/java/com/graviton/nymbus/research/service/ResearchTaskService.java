package com.graviton.nymbus.research.service;

import com.graviton.nymbus.agent.dto.ExecutionResponse;
import com.graviton.nymbus.agent.repository.AgentExecutionRepository;
import com.graviton.nymbus.common.exception.ResourceNotFoundException;
import com.graviton.nymbus.conversation.entity.ConversationMessage;
import com.graviton.nymbus.conversation.repository.ConversationMessageRepository;
import com.graviton.nymbus.evidence.dto.EvidenceResponse;
import com.graviton.nymbus.evidence.service.EvidenceService;
import com.graviton.nymbus.report.dto.ReportResponse;
import com.graviton.nymbus.report.entity.ResearchReport;
import com.graviton.nymbus.report.repository.ResearchReportRepository;
import com.graviton.nymbus.research.dto.CreateTaskRequest;
import com.graviton.nymbus.research.dto.ResearchTaskStatusResponse;
import com.graviton.nymbus.research.dto.TaskResponse;
import com.graviton.nymbus.research.entity.ExecutionMode;
import com.graviton.nymbus.research.entity.ResearchTask;
import com.graviton.nymbus.research.entity.TaskStatus;
import com.graviton.nymbus.research.repository.ResearchTaskRepository;
import com.graviton.nymbus.source.dto.SourceResponse;
import com.graviton.nymbus.source.service.SourceService;
import com.graviton.nymbus.user.entity.User;
import com.graviton.nymbus.user.service.CurrentUserService;
import com.graviton.nymbus.workflow.dto.SubTaskResponse;
import com.graviton.nymbus.workflow.dto.WorkflowEventResponse;
import com.graviton.nymbus.workflow.repository.SubTaskRepository;
import com.graviton.nymbus.workflow.service.WorkflowEventService;
import com.graviton.nymbus.workflow.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResearchTaskService {

    private final ResearchTaskRepository researchTaskRepository;
    private final SubTaskRepository subTaskRepository;
    private final AgentExecutionRepository agentExecutionRepository;
    private final ResearchReportRepository researchReportRepository;
    private final ConversationMessageRepository conversationMessageRepository;
    private final CurrentUserService currentUserService;
    private final WorkflowService workflowService;
    private final WorkflowEventService workflowEventService;
    private final SourceService sourceService;
    private final EvidenceService evidenceService;

    @Transactional
    public TaskResponse createTask(CreateTaskRequest request) {
        User user = currentUserService.getCurrentUser();

        ResearchTask task = ResearchTask.builder()
                .user(user)
                .title(request.title())
                .prompt(request.prompt())
                .status(TaskStatus.PENDING)
                .executionMode(request.executionMode() != null ? request.executionMode() : ExecutionMode.STANDARD)
                .tokenBudget(request.tokenBudget())
                .costBudgetUsd(request.costBudgetUsd())
                .build();

        task = researchTaskRepository.save(task);
        log.info("Created research task {} for user {}", task.getId(), user.getId());
        return TaskResponse.fromEntity(task);
    }

    @Transactional(readOnly = true)
    public Page<TaskResponse> listTasks(Pageable pageable) {
        User user = currentUserService.getCurrentUser();
        return researchTaskRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable)
                .map(TaskResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public TaskResponse getTask(UUID taskId) {
        ResearchTask task = getTaskWithOwnershipCheck(taskId);
        return TaskResponse.fromEntity(task);
    }

    @Transactional(readOnly = true)
    public ResearchTaskStatusResponse getTaskStatus(UUID taskId) {
        User user = currentUserService.getCurrentUser();
        return getTaskStatus(taskId, user);
    }

    @Transactional(readOnly = true)
    public ResearchTaskStatusResponse getTaskStatus(UUID taskId, User user) {
        ResearchTask task = researchTaskRepository.findByIdAndUserId(taskId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Research task not found with id: " + taskId));

        UUID messageId = conversationMessageRepository.findFirstByResearchTaskIdOrderByCreatedAtDesc(taskId)
                .map(ConversationMessage::getId)
                .orElse(null);

        Optional<ResearchReport> latestReport = researchReportRepository.findTopByResearchTaskIdOrderByVersionDesc(taskId);
        UUID reportId = latestReport.map(ResearchReport::getId).orElse(null);
        String reportTitle = latestReport.map(ResearchReport::getTitle).orElse(null);

        return ResearchTaskStatusResponse.builder()
                .taskId(task.getId())
                .conversationId(task.getConversationId())
                .messageId(messageId)
                .status(task.getStatus())
                .executionMode(task.getExecutionMode())
                .title(task.getTitle())
                .reportId(reportId)
                .reportTitle(reportTitle)
                .errorMessage(task.getFailureReason())
                .startedAt(task.getStartedAt())
                .completedAt(task.getCompletedAt())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public List<ResearchTaskStatusResponse> getTasksForConversation(UUID conversationId, User user) {
        List<ResearchTask> tasks = researchTaskRepository.findByConversationIdOrderByCreatedAtDesc(conversationId);
        return tasks.stream()
                .filter(t -> t.getUser().getId().equals(user.getId()))
                .map(task -> {
                    UUID messageId = conversationMessageRepository.findFirstByResearchTaskIdOrderByCreatedAtDesc(task.getId())
                            .map(ConversationMessage::getId)
                            .orElse(null);
                    Optional<ResearchReport> latestReport = researchReportRepository.findTopByResearchTaskIdOrderByVersionDesc(task.getId());
                    return ResearchTaskStatusResponse.builder()
                            .taskId(task.getId())
                            .conversationId(task.getConversationId())
                            .messageId(messageId)
                            .status(task.getStatus())
                            .executionMode(task.getExecutionMode())
                            .title(task.getTitle())
                            .reportId(latestReport.map(ResearchReport::getId).orElse(null))
                            .reportTitle(latestReport.map(ResearchReport::getTitle).orElse(null))
                            .errorMessage(task.getFailureReason())
                            .startedAt(task.getStartedAt())
                            .completedAt(task.getCompletedAt())
                            .createdAt(task.getCreatedAt())
                            .updatedAt(task.getUpdatedAt())
                            .build();
                })
                .toList();
    }

    /**
     * Idempotently starts workflow execution.
     */
    public TaskResponse executeTask(UUID taskId) {
        // Ownership check
        ResearchTask task = getTaskWithOwnershipCheck(taskId);

        // Atomic trigger
        boolean started = workflowService.triggerExecution(taskId);
        if (started) {
            workflowService.runWorkflowAsync(taskId);
        }

        // Return latest state
        return TaskResponse.fromEntity(researchTaskRepository.findById(taskId).orElse(task));
    }

    @Transactional(readOnly = true)
    public List<SubTaskResponse> getSubTasks(UUID taskId) {
        getTaskWithOwnershipCheck(taskId);
        return subTaskRepository.findByResearchTaskIdOrderByPriorityAscCreatedAtAsc(taskId)
                .stream()
                .map(SubTaskResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ExecutionResponse> getExecutions(UUID taskId) {
        getTaskWithOwnershipCheck(taskId);
        return agentExecutionRepository.findByResearchTaskIdOrderByStartedAtAsc(taskId)
                .stream()
                .map(ExecutionResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReportResponse> getReports(UUID taskId) {
        getTaskWithOwnershipCheck(taskId);
        return researchReportRepository.findByResearchTaskIdOrderByVersionDesc(taskId)
                .stream()
                .map(ReportResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<WorkflowEventResponse> getEvents(UUID taskId) {
        getTaskWithOwnershipCheck(taskId);
        return workflowEventService.getEvents(taskId)
                .stream()
                .map(WorkflowEventResponse::fromEntity)
                .toList();
    }

    public SseEmitter streamEvents(UUID taskId, UUID lastEventId) {
        getTaskWithOwnershipCheck(taskId);
        return workflowEventService.subscribe(taskId, lastEventId);
    }

    @Transactional(readOnly = true)
    public List<SourceResponse> getSources(UUID taskId) {
        getTaskWithOwnershipCheck(taskId);
        return sourceService.getSourcesForTask(taskId)
                .stream()
                .map(SourceResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EvidenceResponse> getEvidence(UUID taskId) {
        getTaskWithOwnershipCheck(taskId);
        return evidenceService.getEvidenceForTask(taskId)
                .stream()
                .map(EvidenceResponse::fromEntity)
                .toList();
    }

    private ResearchTask getTaskWithOwnershipCheck(UUID taskId) {
        User user = currentUserService.getCurrentUser();
        return researchTaskRepository.findByIdAndUserId(taskId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Research task not found with id: " + taskId));
    }
}
