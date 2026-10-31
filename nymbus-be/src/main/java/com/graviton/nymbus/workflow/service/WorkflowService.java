package com.graviton.nymbus.workflow.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.graviton.nymbus.agent.dto.*;
import com.graviton.nymbus.agent.entity.*;
import com.graviton.nymbus.agent.orchestrator.OrchestratorAgent;
import com.graviton.nymbus.agent.report.ReportAgent;
import com.graviton.nymbus.agent.repository.AgentExecutionRepository;
import com.graviton.nymbus.agent.repository.AgentRepository;
import com.graviton.nymbus.agent.research.ResearchAgent;
import com.graviton.nymbus.report.entity.ReportStatus;
import com.graviton.nymbus.report.entity.ResearchReport;
import com.graviton.nymbus.report.repository.ResearchReportRepository;
import com.graviton.nymbus.research.entity.ResearchTask;
import com.graviton.nymbus.research.entity.TaskStatus;
import com.graviton.nymbus.research.repository.ResearchTaskRepository;
import com.graviton.nymbus.workflow.entity.SubTask;
import com.graviton.nymbus.workflow.entity.SubTaskStatus;
import com.graviton.nymbus.workflow.entity.TaskDependency;
import com.graviton.nymbus.workflow.repository.SubTaskRepository;
import com.graviton.nymbus.workflow.repository.TaskDependencyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowService {

    private final ResearchTaskRepository researchTaskRepository;
    private final AgentRepository agentRepository;
    private final AgentExecutionRepository agentExecutionRepository;
    private final SubTaskRepository subTaskRepository;
    private final TaskDependencyRepository taskDependencyRepository;
    private final ResearchReportRepository researchReportRepository;

    private final OrchestratorAgent orchestratorAgent;
    private final ResearchAgent researchAgent;
    private final ReportAgent reportAgent;
    private final ObjectMapper objectMapper;

    @Value("${nymbus.workflow.max-retries:2}")
    private int maxRetries;

    /**
     * Attempts to atomically start the workflow for the given task.
     * Returns true if this invocation claimed the task and started execution;
     * returns false if task was not in PENDING state (idempotent safeguard).
     */
    @Transactional
    public boolean triggerExecution(UUID taskId) {
        int updated = researchTaskRepository.transitionStatusIfExpected(
                taskId, TaskStatus.PENDING, TaskStatus.PLANNING, Instant.now());
        if (updated > 0) {
            log.info("Task {} claimed for workflow execution (PENDING -> PLANNING)", taskId);
            return true;
        } else {
            log.info("Task {} not in PENDING state; execution trigger ignored idempotently", taskId);
            return false;
        }
    }

    @Async("workflowExecutor")
    public void runWorkflowAsync(UUID taskId) {
        log.info("Starting asynchronous workflow execution for task: {}", taskId);

        ResearchTask task = researchTaskRepository.findById(taskId).orElse(null);
        if (task == null) {
            log.error("Task {} not found during workflow start", taskId);
            return;
        }

        try {
            // Step 1: Orchestration Planning (Outside DB Transaction)
            long startTime = System.currentTimeMillis();
            PlanOutput planOutput = orchestratorAgent.plan(task.getTitle(), task.getPrompt());
            long planningDuration = System.currentTimeMillis() - startTime;

            // Step 2: Persist Plan and SubTasks (Short DB Transaction)
            persistPlanAndSubTasks(taskId, planOutput, planningDuration);

            // Step 3: Execute SubTasks until completion or failure
            executeSubTasksLoop(taskId);

            // Step 4: Generate Report if all subtasks completed
            boolean allCompleted = checkAllSubTasksCompleted(taskId);
            if (allCompleted) {
                generateAndSaveReport(taskId);
            } else {
                log.warn("Not all subtasks completed for task {}. Report generation skipped.", taskId);
            }

        } catch (Exception e) {
            log.error("Workflow failed for task {}: {}", taskId, e.getMessage(), e);
            failTask(taskId, "Workflow execution encountered an unrecoverable error: " + e.getMessage());
        }
    }

    @Transactional
    public void persistPlanAndSubTasks(UUID taskId, PlanOutput planOutput, long durationMs) {
        ResearchTask task = researchTaskRepository.findById(taskId).orElseThrow();
        Agent orchestratorAgentDef = agentRepository.findByCode(AgentCode.ORCHESTRATOR).orElseThrow();

        Map<String, Object> planMap = objectMapper.convertValue(planOutput, new TypeReference<>() {});
        task.setPlan(planMap);
        task.setStatus(TaskStatus.RUNNING);
        researchTaskRepository.save(task);

        // Record Orchestrator Execution
        AgentExecution execution = AgentExecution.builder()
                .researchTask(task)
                .agent(orchestratorAgentDef)
                .attemptNumber(1)
                .status(ExecutionStatus.SUCCEEDED)
                .inputPayload(Map.of("prompt", task.getPrompt(), "title", task.getTitle()))
                .outputPayload(planMap)
                .modelName(getModelName(orchestratorAgentDef))
                .executionTimeMs(durationMs)
                .completedAt(Instant.now())
                .build();
        agentExecutionRepository.save(execution);

        // Persist SubTasks and map tempId -> SubTask
        Agent researchAgentDef = agentRepository.findByCode(AgentCode.RESEARCH).orElseThrow();
        Map<String, SubTask> tempIdToSubTask = new HashMap<>();

        for (PlannedSubTaskDto dto : planOutput.subTasks()) {
            boolean hasDependencies = dto.dependsOnTempIds() != null && !dto.dependsOnTempIds().isEmpty();
            SubTask subTask = SubTask.builder()
                    .researchTask(task)
                    .agent(researchAgentDef)
                    .title(dto.title())
                    .description(dto.description())
                    .priority(Math.max(1, Math.min(dto.priority(), 5)))
                    .status(hasDependencies ? SubTaskStatus.BLOCKED : SubTaskStatus.READY)
                    .inputPayload(Map.of("tempId", dto.tempId(), "objective", dto.description()))
                    .build();
            subTask = subTaskRepository.save(subTask);
            tempIdToSubTask.put(dto.tempId(), subTask);
        }

        // Persist Dependencies
        for (PlannedSubTaskDto dto : planOutput.subTasks()) {
            if (dto.dependsOnTempIds() != null) {
                SubTask dependent = tempIdToSubTask.get(dto.tempId());
                for (String depTempId : dto.dependsOnTempIds()) {
                    SubTask prerequisite = tempIdToSubTask.get(depTempId);
                    if (prerequisite != null && dependent != null) {
                        TaskDependency dep = TaskDependency.builder()
                                .subTaskId(dependent.getId())
                                .dependsOnSubTaskId(prerequisite.getId())
                                .build();
                        taskDependencyRepository.save(dep);
                    }
                }
            }
        }

        log.info("Plan and {} subtasks persisted for task {}", planOutput.subTasks().size(), taskId);
    }

    private void executeSubTasksLoop(UUID taskId) {
        while (true) {
            ResearchTask task = researchTaskRepository.findById(taskId).orElse(null);
            if (task == null || task.getStatus() == TaskStatus.FAILED || task.getStatus() == TaskStatus.CANCELLED) {
                log.info("Task {} terminated or failed. Stopping execution loop.", taskId);
                break;
            }

            List<SubTask> readySubTasks = getReadySubTasks(taskId);
            if (readySubTasks.isEmpty()) {
                // Check if any in-progress or blocked
                long inProgressCount = subTaskRepository.countByResearchTaskIdAndStatus(taskId, SubTaskStatus.IN_PROGRESS);
                long blockedCount = subTaskRepository.countByResearchTaskIdAndStatus(taskId, SubTaskStatus.BLOCKED);

                if (inProgressCount == 0 && blockedCount == 0) {
                    log.info("No active, ready, or blocked subtasks remaining for task {}", taskId);
                    break;
                }
                if (inProgressCount == 0 && blockedCount > 0) {
                    log.error("Deadlock: subtasks remain BLOCKED with none IN_PROGRESS for task {}", taskId);
                    failTask(taskId, "Dependency resolution stalled due to unresolved blocked subtasks");
                    break;
                }

                try {
                    Thread.sleep(500);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
                continue;
            }

            // Process ready subtasks sequentially or bounded
            for (SubTask st : readySubTasks) {
                processSingleSubTask(st.getId(), taskId);
            }
        }
    }

    @Transactional(readOnly = true)
    public List<SubTask> getReadySubTasks(UUID taskId) {
        return subTaskRepository.findByResearchTaskIdAndStatus(taskId, SubTaskStatus.READY);
    }

    private void processSingleSubTask(UUID subTaskId, UUID taskId) {
        // Step 1: Claim subtask and start execution record (Short TX)
        ExecutionClaim claim = claimSubTaskForExecution(subTaskId, taskId);
        if (claim == null) {
            return;
        }

        long start = System.currentTimeMillis();
        ResearchOutput researchOutput = null;
        Exception error = null;

        // Step 2: Execute tool and model calls (NO DB TRANSACTION)
        try {
            researchOutput = researchAgent.executeResearch(claim.subTaskTitle(), claim.subTaskDescription(), claim.taskPrompt());
        } catch (Exception e) {
            log.error("Error executing research subtask {}: {}", subTaskId, e.getMessage(), e);
            error = e;
        }
        long duration = System.currentTimeMillis() - start;

        // Step 3: Complete or retry subtask (Short TX)
        if (researchOutput != null) {
            completeSubTaskSuccess(subTaskId, claim.executionId(), researchOutput, duration, taskId);
        } else {
            handleSubTaskFailure(subTaskId, claim.executionId(), error != null ? error.getMessage() : "Unknown error", claim.attemptNumber(), taskId);
        }
    }

    @Transactional
    public ExecutionClaim claimSubTaskForExecution(UUID subTaskId, UUID taskId) {
        SubTask subTask = subTaskRepository.findById(subTaskId).orElse(null);
        if (subTask == null || subTask.getStatus() != SubTaskStatus.READY) {
            return null;
        }

        subTask.setStatus(SubTaskStatus.IN_PROGRESS);
        subTask.setStartedAt(Instant.now());
        subTaskRepository.save(subTask);

        Optional<AgentExecution> latestExec = agentExecutionRepository.findTopBySubTaskIdOrderByAttemptNumberDesc(subTaskId);
        int nextAttempt = latestExec.map(e -> e.getAttemptNumber() + 1).orElse(1);

        Agent researchAgentDef = agentRepository.findByCode(AgentCode.RESEARCH).orElseThrow();
        ResearchTask task = researchTaskRepository.findById(taskId).orElseThrow();

        AgentExecution execution = AgentExecution.builder()
                .researchTask(task)
                .subTask(subTask)
                .agent(researchAgentDef)
                .attemptNumber(nextAttempt)
                .status(ExecutionStatus.RUNNING)
                .inputPayload(subTask.getInputPayload())
                .modelName(getModelName(researchAgentDef))
                .build();
        execution = agentExecutionRepository.save(execution);

        return new ExecutionClaim(
                execution.getId(),
                subTask.getTitle(),
                subTask.getDescription(),
                task.getPrompt(),
                nextAttempt
        );
    }

    @Transactional
    public void completeSubTaskSuccess(UUID subTaskId, UUID executionId, ResearchOutput output, long durationMs, UUID taskId) {
        SubTask subTask = subTaskRepository.findById(subTaskId).orElseThrow();
        subTask.setStatus(SubTaskStatus.COMPLETED);
        subTask.setResultSummary(output.summary());
        subTask.setCompletedAt(Instant.now());
        subTaskRepository.save(subTask);

        AgentExecution execution = agentExecutionRepository.findById(executionId).orElseThrow();
        execution.setStatus(ExecutionStatus.SUCCEEDED);
        execution.setOutputPayload(objectMapper.convertValue(output, new TypeReference<>() {}));
        execution.setExecutionTimeMs(durationMs);
        execution.setCompletedAt(Instant.now());
        agentExecutionRepository.save(execution);

        // Promote newly unblocked subtasks (BLOCKED -> READY)
        List<SubTask> unblocked = subTaskRepository.findUnblockedSubTasks(taskId);
        for (SubTask st : unblocked) {
            st.setStatus(SubTaskStatus.READY);
            subTaskRepository.save(st);
            log.info("Promoted subtask {} to READY as its dependencies are completed", st.getId());
        }
    }

    @Transactional
    public void handleSubTaskFailure(UUID subTaskId, UUID executionId, String errorMessage, int attemptNumber, UUID taskId) {
        AgentExecution execution = agentExecutionRepository.findById(executionId).orElseThrow();
        execution.setStatus(ExecutionStatus.FAILED);
        execution.setErrorMessage(errorMessage);
        execution.setCompletedAt(Instant.now());
        agentExecutionRepository.save(execution);

        SubTask subTask = subTaskRepository.findById(subTaskId).orElseThrow();

        if (attemptNumber <= maxRetries) {
            log.warn("Subtask {} failed attempt {}/{}. Returning to READY for retry.", subTaskId, attemptNumber, maxRetries);
            subTask.setStatus(SubTaskStatus.READY);
            subTaskRepository.save(subTask);
        } else {
            log.error("Subtask {} exhausted max retries ({}). Marking FAILED and cancelling workflow.", subTaskId, maxRetries);
            subTask.setStatus(SubTaskStatus.FAILED);
            subTaskRepository.save(subTask);

            // Cancel any remaining unfinished subtasks
            List<SubTask> allSubTasks = subTaskRepository.findByResearchTaskIdOrderByPriorityAscCreatedAtAsc(taskId);
            for (SubTask st : allSubTasks) {
                if (st.getStatus() != SubTaskStatus.COMPLETED && st.getStatus() != SubTaskStatus.FAILED) {
                    st.setStatus(SubTaskStatus.CANCELLED);
                    subTaskRepository.save(st);
                }
            }

            failTask(taskId, "Subtask '" + subTask.getTitle() + "' failed after " + maxRetries + " retries: " + errorMessage);
        }
    }

    private void generateAndSaveReport(UUID taskId) {
        log.info("Generating final report for task: {}", taskId);

        ResearchTask task = researchTaskRepository.findById(taskId).orElseThrow();
        List<SubTask> subTasks = subTaskRepository.findByResearchTaskIdOrderByPriorityAscCreatedAtAsc(taskId);

        List<SubTaskSummaryDto> summaries = subTasks.stream()
                .map(st -> new SubTaskSummaryDto(st.getId(), st.getTitle(), st.getDescription(), st.getResultSummary()))
                .toList();

        long start = System.currentTimeMillis();
        ReportOutput reportOutput = reportAgent.generateReport(task.getTitle(), task.getPrompt(), summaries);
        long duration = System.currentTimeMillis() - start;

        persistFinalReport(taskId, reportOutput, duration);
    }

    @Transactional
    public void persistFinalReport(UUID taskId, ReportOutput reportOutput, long durationMs) {
        ResearchTask task = researchTaskRepository.findById(taskId).orElseThrow();
        Agent reportAgentDef = agentRepository.findByCode(AgentCode.REPORT).orElseThrow();

        // Execution record for ReportAgent
        AgentExecution execution = AgentExecution.builder()
                .researchTask(task)
                .agent(reportAgentDef)
                .attemptNumber(1)
                .status(ExecutionStatus.SUCCEEDED)
                .inputPayload(Map.of("title", task.getTitle(), "prompt", task.getPrompt()))
                .outputPayload(objectMapper.convertValue(reportOutput, new TypeReference<>() {}))
                .modelName(getModelName(reportAgentDef))
                .executionTimeMs(durationMs)
                .completedAt(Instant.now())
                .build();
        execution = agentExecutionRepository.save(execution);

        // Research report version
        int nextVersion = researchReportRepository.findTopByResearchTaskIdOrderByVersionDesc(taskId)
                .map(r -> r.getVersion() + 1).orElse(1);

        ResearchReport report = ResearchReport.builder()
                .researchTask(task)
                .version(nextVersion)
                .title(reportOutput.title())
                .executiveSummary(reportOutput.executiveSummary())
                .status(ReportStatus.COMPLETED)
                .contentMarkdown(reportOutput.contentMarkdown())
                .generatedByExecutionId(execution.getId())
                .completedAt(Instant.now())
                .build();
        researchReportRepository.save(report);

        // Mark task completed
        task.setStatus(TaskStatus.COMPLETED);
        task.setCompletedAt(Instant.now());
        researchTaskRepository.save(task);

        log.info("Task {} successfully COMPLETED with report version {}", taskId, nextVersion);
    }

    @Transactional
    public void failTask(UUID taskId, String reason) {
        researchTaskRepository.findById(taskId).ifPresent(task -> {
            task.setStatus(TaskStatus.FAILED);
            task.setFailureReason(reason);
            task.setCompletedAt(Instant.now());
            researchTaskRepository.save(task);
            log.warn("Task {} marked FAILED: {}", taskId, reason);
        });
    }

    @Transactional(readOnly = true)
    public boolean checkAllSubTasksCompleted(UUID taskId) {
        long total = subTaskRepository.countByResearchTaskId(taskId);
        long completed = subTaskRepository.countByResearchTaskIdAndStatus(taskId, SubTaskStatus.COMPLETED);
        return total > 0 && total == completed;
    }

    private String getModelName(Agent agent) {
        if (agent.getConfiguration() != null && agent.getConfiguration().containsKey("model")) {
            return String.valueOf(agent.getConfiguration().get("model"));
        }
        return "openai/gpt-4o-mini";
    }

    public record ExecutionClaim(
            UUID executionId,
            String subTaskTitle,
            String subTaskDescription,
            String taskPrompt,
            int attemptNumber
    ) {}
}
