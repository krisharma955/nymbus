package com.graviton.nymbus.research.service;

import com.graviton.nymbus.agent.dto.ExecutionResponse;
import com.graviton.nymbus.agent.repository.AgentExecutionRepository;
import com.graviton.nymbus.common.exception.ResourceNotFoundException;
import com.graviton.nymbus.report.dto.ReportResponse;
import com.graviton.nymbus.report.repository.ResearchReportRepository;
import com.graviton.nymbus.research.dto.CreateTaskRequest;
import com.graviton.nymbus.research.dto.TaskResponse;
import com.graviton.nymbus.research.entity.ExecutionMode;
import com.graviton.nymbus.research.entity.ResearchTask;
import com.graviton.nymbus.research.entity.TaskStatus;
import com.graviton.nymbus.research.repository.ResearchTaskRepository;
import com.graviton.nymbus.user.entity.User;
import com.graviton.nymbus.user.service.CurrentUserService;
import com.graviton.nymbus.workflow.dto.SubTaskResponse;
import com.graviton.nymbus.workflow.repository.SubTaskRepository;
import com.graviton.nymbus.workflow.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResearchTaskService {

    private final ResearchTaskRepository researchTaskRepository;
    private final SubTaskRepository subTaskRepository;
    private final AgentExecutionRepository agentExecutionRepository;
    private final ResearchReportRepository researchReportRepository;
    private final CurrentUserService currentUserService;
    private final WorkflowService workflowService;

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

    private ResearchTask getTaskWithOwnershipCheck(UUID taskId) {
        User user = currentUserService.getCurrentUser();
        return researchTaskRepository.findByIdAndUserId(taskId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Research task not found with id: " + taskId));
    }
}
