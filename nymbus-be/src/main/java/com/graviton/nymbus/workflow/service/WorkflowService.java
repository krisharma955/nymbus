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
import com.graviton.nymbus.agent.service.AgentMessageService;
import com.graviton.nymbus.evidence.entity.Evidence;
import com.graviton.nymbus.evidence.entity.VerificationStatus;
import com.graviton.nymbus.evidence.service.EvidenceService;
import com.graviton.nymbus.report.entity.ReportStatus;
import com.graviton.nymbus.report.entity.ResearchReport;
import com.graviton.nymbus.report.repository.ResearchReportRepository;
import com.graviton.nymbus.research.entity.ResearchTask;
import com.graviton.nymbus.research.entity.TaskStatus;
import com.graviton.nymbus.research.repository.ResearchTaskRepository;
import com.graviton.nymbus.source.entity.Source;
import com.graviton.nymbus.source.service.SourceService;
import com.graviton.nymbus.tool.model.SearchResult;
import com.graviton.nymbus.tool.service.ToolExecutionService;
import com.graviton.nymbus.workflow.entity.SubTask;
import com.graviton.nymbus.workflow.entity.SubTaskStatus;
import com.graviton.nymbus.workflow.entity.TaskDependency;
import com.graviton.nymbus.workflow.entity.WorkflowEventType;
import com.graviton.nymbus.workflow.repository.SubTaskRepository;
import com.graviton.nymbus.workflow.repository.TaskDependencyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final com.graviton.nymbus.agent.analysis.AnalysisAgent analysisAgent;
    private final ReportAgent reportAgent;
    private final ObjectMapper objectMapper;

    private final SourceService sourceService;
    private final ToolExecutionService toolExecutionService;
    private final EvidenceService evidenceService;
    private final com.graviton.nymbus.evidence.repository.EvidenceRepository evidenceRepository;
    private final com.graviton.nymbus.report.repository.ReportSectionRepository reportSectionRepository;
    private final com.graviton.nymbus.report.repository.ReportSectionEvidenceRepository reportSectionEvidenceRepository;
    private final WorkflowEventService workflowEventService;
    private final AgentMessageService agentMessageService;
    private final com.graviton.nymbus.document.service.DocumentService documentService;
    private final com.graviton.nymbus.document.repository.DocumentChunkRepository documentChunkRepository;

    @Value("${nymbus.workflow.max-retries:2}")
    private int maxRetries;

    // Track re-research passes per subtask (max 1 extra pass)
    private final Set<UUID> reResearchedSubTasks = Collections.synchronizedSet(new HashSet<>());

    @Transactional
    public boolean triggerExecution(UUID taskId) {
        int updated = researchTaskRepository.transitionStatusIfExpected(
                taskId, TaskStatus.PENDING, TaskStatus.PLANNING, Instant.now());
        if (updated > 0) {
            log.info("Task {} claimed for workflow execution (PENDING -> PLANNING)", taskId);
            workflowEventService.recordEvent(
                    taskId, null, null,
                    WorkflowEventType.TASK_STARTED,
                    "Task execution started. Orchestrator initializing research plan.",
                    Collections.emptyMap()
            );
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
                failTask(taskId, "One or more research subtasks failed to complete.");
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
        execution = agentExecutionRepository.save(execution);

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

        // Emit PLAN_CREATED event
        workflowEventService.recordEvent(
                taskId, null, execution,
                WorkflowEventType.PLAN_CREATED,
                "Research plan established with " + planOutput.subTasks().size() + " subtasks.",
                Map.of("subtaskCount", planOutput.subTasks().size(), "overview", planOutput.overview())
        );

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
        ExecutionClaim claim = claimSubTaskForExecution(subTaskId, taskId);
        if (claim == null) {
            return;
        }

        // RAG: Retrieve relevant private document chunks for the subtask query
        List<com.graviton.nymbus.document.entity.DocumentChunk> taskChunks = Collections.emptyList();
        try {
            taskChunks = documentService.searchTaskChunks(taskId, claim.subTaskTitle(), 3);
        } catch (Exception e) {
            log.debug("Document chunk search returned no results or failed: {}", e.getMessage());
        }

        List<SearchResult> docSources = new ArrayList<>();
        for (com.graviton.nymbus.document.entity.DocumentChunk chunk : taskChunks) {
            String docFileName = (chunk.getDocument() != null && chunk.getDocument().getFileName() != null)
                    ? chunk.getDocument().getFileName()
                    : "Document";
            UUID docId = chunk.getDocument() != null ? chunk.getDocument().getId() : chunk.getId();
            String title = docFileName + " (Page " + (chunk.getPageNumber() != null ? chunk.getPageNumber() : 1) + ")";
            String url = "doc://" + docId + "/chunks/" + chunk.getId();
            docSources.add(new SearchResult(title, url, chunk.getContent(), 1.0));
        }

        long start = System.currentTimeMillis();
        ResearchAgent.ResearchExecutionResult execResult = null;
        Exception error = null;

        try {
            execResult = researchAgent.executeResearchWithAudit(
                    claim.subTaskTitle(), claim.subTaskDescription(), claim.taskPrompt(), docSources);
        } catch (Exception e) {
            log.error("Error executing research subtask {}: {}", subTaskId, e.getMessage(), e);
            error = e;
        }
        long duration = System.currentTimeMillis() - start;

        if (execResult != null && execResult.output() != null) {
            completeSubTaskWithEvidence(subTaskId, claim.executionId(), execResult, duration, taskId);
        } else {
            handleSubTaskFailure(subTaskId, claim.executionId(),
                    error != null ? error.getMessage() : "Research execution returned no output",
                    claim.attemptNumber(), taskId);
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

        // Emit SUBTASK_STARTED event & TASK_ASSIGNMENT message
        workflowEventService.recordEvent(
                taskId, subTask, execution,
                WorkflowEventType.SUBTASK_STARTED,
                "Subtask started: " + subTask.getTitle(),
                Map.of("priority", subTask.getPriority(), "attempt", nextAttempt)
        );

        agentMessageService.recordMessage(
                task, execution, null,
                AgentMessageType.TASK_ASSIGNMENT,
                Map.of("subTaskId", subTaskId, "title", subTask.getTitle())
        );

        return new ExecutionClaim(
                execution.getId(),
                subTask.getTitle(),
                subTask.getDescription(),
                task.getPrompt(),
                nextAttempt
        );
    }

    @Transactional
    public void completeSubTaskWithEvidence(
            UUID subTaskId,
            UUID researchExecutionId,
            ResearchAgent.ResearchExecutionResult execResult,
            long durationMs,
            UUID taskId) {

        SubTask subTask = subTaskRepository.findById(subTaskId).orElseThrow();
        ResearchTask task = researchTaskRepository.findById(taskId).orElseThrow();
        AgentExecution researchExec = agentExecutionRepository.findById(researchExecutionId).orElseThrow();
        Agent verificationAgentDef = agentRepository.findByCode(AgentCode.VERIFICATION).orElseThrow();

        // 1. Audit Tool Execution (Web Search)
        UUID toolExecId = toolExecutionService.startToolExecution(
                researchExecutionId, "tavily_search",
                Map.of("query", subTask.getTitle(), "count", execResult.searchResults().size())
        );
        toolExecutionService.completeToolExecution(
                toolExecId,
                Map.of("resultsCount", execResult.searchResults().size()),
                execResult.searchDurationMs()
        );

        // 2. Ingest and persist Sources
        Map<String, Source> urlToSource = new HashMap<>();
        Map<String, com.graviton.nymbus.document.entity.DocumentChunk> urlToChunk = new HashMap<>();

        for (SearchResult sr : execResult.searchResults()) {
            Source src;
            if (sr.url() != null && sr.url().startsWith("doc://")) {
                UUID chunkId = extractChunkId(sr.url());
                com.graviton.nymbus.document.entity.DocumentChunk chunk = chunkId != null
                        ? documentChunkRepository.findById(chunkId).orElse(null)
                        : null;
                if (chunk != null) {
                    src = sourceService.createOrGetUserDocumentSource(taskId, chunk.getDocument(), chunk);
                    urlToChunk.put(sr.url(), chunk);
                } else {
                    src = sourceService.getOrCreateSource(taskId, sr.url(), sr.title(), sr.content(), Collections.emptyMap());
                }
            } else {
                src = sourceService.getOrCreateSource(
                        taskId, sr.url(), sr.title(), sr.content(),
                        Map.of("score", sr.score() != null ? sr.score() : 1.0)
                );
            }

            urlToSource.put(sr.url(), src);
            workflowEventService.recordEvent(
                    taskId, subTask, researchExec,
                    WorkflowEventType.SOURCE_FOUND,
                    "Source collected: " + src.getTitle() + " (" + src.getDomain() + ")",
                    Map.of("sourceId", src.getId(), "url", src.getUrl(), "domain", src.getDomain())
            );
        }

        // 3. Create VerificationAgent Execution (task-level execution tracking verification phase)
        AgentExecution verifExec = AgentExecution.builder()
                .researchTask(task)
                .agent(verificationAgentDef)
                .attemptNumber(1)
                .status(ExecutionStatus.SUCCEEDED)
                .inputPayload(Map.of("subTaskId", subTask.getId().toString(), "subTaskTitle", subTask.getTitle()))
                .modelName(getModelName(verificationAgentDef))
                .completedAt(Instant.now())
                .build();
        verifExec = agentExecutionRepository.save(verifExec);

        // 4. Verify Claims & Persist Evidence
        boolean hasRejectedClaim = false;
        for (ResearchFindingDto finding : execResult.output().findings()) {
            Source matchedSource = urlToSource.get(finding.sourceUrl());
            if (matchedSource == null && !urlToSource.isEmpty()) {
                matchedSource = urlToSource.values().iterator().next();
            }
            if (matchedSource == null) {
                matchedSource = sourceService.getOrCreateSource(
                        taskId, finding.sourceUrl(), finding.sourceTitle(), finding.excerpt(), Collections.emptyMap()
                );
            }

            com.graviton.nymbus.document.entity.DocumentChunk linkedChunk = urlToChunk.get(finding.sourceUrl());

            workflowEventService.recordEvent(
                    taskId, subTask, researchExec,
                    WorkflowEventType.CLAIM_EXTRACTED,
                    "Claim extracted: " + finding.fact(),
                    Map.of("fact", finding.fact(), "excerpt", finding.excerpt())
            );

            Evidence evidence = evidenceService.createAndVerifyEvidence(
                    task, researchExec, verifExec, matchedSource, linkedChunk,
                    finding.fact(), finding.excerpt(), finding.sourceUrl()
            );

            if (evidence.getVerificationStatus() == VerificationStatus.VERIFIED) {
                workflowEventService.recordEvent(
                        taskId, subTask, verifExec,
                        WorkflowEventType.CLAIM_VERIFIED,
                        "Claim verified: " + finding.fact(),
                        Map.of("evidenceId", evidence.getId(), "confidence", evidence.getConfidenceScore())
                );
            } else {
                hasRejectedClaim = true;
                workflowEventService.recordEvent(
                        taskId, subTask, verifExec,
                        WorkflowEventType.CLAIM_REJECTED,
                        "Claim rejected or inconclusive: " + finding.fact(),
                        Map.of("evidenceId", evidence.getId(), "status", evidence.getVerificationStatus().name())
                );
            }
        }

        // 5. Bounded Re-Research (at most 1 extra pass if claims rejected/weak)
        if (hasRejectedClaim && !reResearchedSubTasks.contains(subTaskId)) {
            reResearchedSubTasks.add(subTaskId);
            log.info("Triggering bounded 1-pass re-research for subtask {}", subTaskId);
            workflowEventService.recordEvent(
                    taskId, subTask, researchExec,
                    WorkflowEventType.RE_RESEARCH_TRIGGERED,
                    "Re-research pass triggered for subtask due to weak/unverified claims: " + subTask.getTitle(),
                    Map.of("subTaskId", subTaskId)
            );

            // Execute follow-up research with refined query
            try {
                String refinedQuery = subTask.getTitle() + " verified empirical data";
                ResearchAgent.ResearchExecutionResult retryResult = researchAgent.executeResearchWithAudit(
                        refinedQuery, subTask.getDescription(), task.getPrompt());
                for (ResearchFindingDto finding : retryResult.output().findings()) {
                    Source src = sourceService.getOrCreateSource(
                            taskId, finding.sourceUrl(), finding.sourceTitle(), finding.excerpt(), Collections.emptyMap());
                    evidenceService.createAndVerifyEvidence(
                            task, researchExec, verifExec, src, finding.fact(), finding.excerpt(), finding.sourceUrl());
                }
            } catch (Exception e) {
                log.warn("Re-research pass failed for subtask {}: {}", subTaskId, e.getMessage());
            }
        }

        // 6. Complete SubTask & Research Execution
        subTask.setStatus(SubTaskStatus.COMPLETED);
        subTask.setResultSummary(execResult.output().summary());
        subTask.setCompletedAt(Instant.now());
        subTaskRepository.save(subTask);

        researchExec.setStatus(ExecutionStatus.SUCCEEDED);
        researchExec.setOutputPayload(objectMapper.convertValue(execResult.output(), new TypeReference<>() {}));
        researchExec.setExecutionTimeMs(durationMs);
        researchExec.setCompletedAt(Instant.now());
        agentExecutionRepository.save(researchExec);

        // Emit completion event & handoff message
        workflowEventService.recordEvent(
                taskId, subTask, researchExec,
                WorkflowEventType.SUBTASK_COMPLETED,
                "Subtask completed: " + subTask.getTitle(),
                Map.of("subTaskId", subTaskId)
        );

        agentMessageService.recordMessage(
                task, researchExec, null,
                AgentMessageType.HANDOFF,
                Map.of("subTaskId", subTaskId, "summary", execResult.output().summary())
        );

        // 7. Promote unblocked subtasks (BLOCKED -> READY)
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

            workflowEventService.recordEvent(
                    taskId, subTask, execution,
                    WorkflowEventType.RETRY_SCHEDULED,
                    "Subtask attempt " + attemptNumber + " failed. Scheduled retry.",
                    Map.of("attempt", attemptNumber, "error", errorMessage)
            );
        } else {
            log.error("Subtask {} exhausted max retries ({}). Marking FAILED and cancelling workflow.", subTaskId, maxRetries);
            subTask.setStatus(SubTaskStatus.FAILED);
            subTaskRepository.save(subTask);

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

        List<com.graviton.nymbus.source.entity.Source> sources = sourceService.getSourcesForTask(taskId);
        List<com.graviton.nymbus.evidence.entity.Evidence> evidenceList = evidenceService.getEvidenceForTask(taskId);

        // 1. Run AnalysisAgent (Phase 4 synthesis)
        long analysisStart = System.currentTimeMillis();
        com.graviton.nymbus.agent.dto.AnalysisOutput analysisOutput = analysisAgent.analyze(
                task.getTitle(), task.getPrompt(), summaries, evidenceList, sources);
        long analysisDuration = System.currentTimeMillis() - analysisStart;

        recordAnalysisExecution(task, analysisOutput, analysisDuration);

        // 2. Run ReportAgent with structured sections and citations
        long reportStart = System.currentTimeMillis();
        ReportOutput reportOutput = reportAgent.generateReport(
                task.getTitle(), task.getPrompt(), summaries, sources, evidenceList, analysisOutput);
        long reportDuration = System.currentTimeMillis() - reportStart;

        persistFinalReport(taskId, reportOutput, reportDuration);
    }

    @Transactional
    public void recordAnalysisExecution(ResearchTask task, com.graviton.nymbus.agent.dto.AnalysisOutput analysisOutput, long durationMs) {
        Agent analysisAgentDef = agentRepository.findByCode(AgentCode.ANALYSIS).orElse(null);
        if (analysisAgentDef == null) return;

        AgentExecution execution = AgentExecution.builder()
                .researchTask(task)
                .agent(analysisAgentDef)
                .attemptNumber(1)
                .status(ExecutionStatus.SUCCEEDED)
                .inputPayload(Map.of("taskTitle", task.getTitle(), "prompt", task.getPrompt()))
                .outputPayload(objectMapper.convertValue(analysisOutput, new TypeReference<>() {}))
                .modelName(getModelName(analysisAgentDef))
                .executionTimeMs(durationMs)
                .completedAt(Instant.now())
                .build();
        agentExecutionRepository.save(execution);

        workflowEventService.recordEvent(
                task.getId(), null, execution,
                WorkflowEventType.ANALYSIS_COMPLETED,
                "Analysis agent completed synthesis and fact categorization.",
                Map.of("keyFindingsCount", analysisOutput.keyFindings().size())
        );
    }

    @Transactional
    public void persistFinalReport(UUID taskId, ReportOutput reportOutput, long durationMs) {
        ResearchTask task = researchTaskRepository.findById(taskId).orElseThrow();
        Agent reportAgentDef = agentRepository.findByCode(AgentCode.REPORT).orElseThrow();

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
        report = researchReportRepository.save(report);

        // Persist Phase 4 Report Sections and Citation Evidence
        if (reportOutput.sections() != null && !reportOutput.sections().isEmpty()) {
            for (com.graviton.nymbus.agent.dto.ReportSectionOutput secDto : reportOutput.sections()) {
                com.graviton.nymbus.report.entity.ReportSection section = com.graviton.nymbus.report.entity.ReportSection.builder()
                        .report(report)
                        .sectionKey(secDto.sectionKey())
                        .title(secDto.title())
                        .contentMarkdown(secDto.contentMarkdown())
                        .sectionOrder(secDto.sectionOrder())
                        .build();
                section = reportSectionRepository.save(section);

                if (secDto.citedEvidenceIds() != null) {
                    int citIdx = 1;
                    for (UUID evId : secDto.citedEvidenceIds()) {
                        if (evId == null) continue;
                        var optEv = evidenceRepository.findById(evId);
                        if (optEv.isPresent()) {
                            com.graviton.nymbus.report.entity.ReportSectionEvidence rse =
                                    com.graviton.nymbus.report.entity.ReportSectionEvidence.builder()
                                            .reportSection(section)
                                            .evidence(optEv.get())
                                            .citationLabel("[" + citIdx++ + "]")
                                            .build();
                            try {
                                reportSectionEvidenceRepository.save(rse);
                            } catch (Exception e) {
                                log.debug("Duplicate evidence citation ignored: {}", e.getMessage());
                            }
                        }
                    }
                }
            }
        }

        task.setStatus(TaskStatus.COMPLETED);
        task.setCompletedAt(Instant.now());
        researchTaskRepository.save(task);

        workflowEventService.recordEvent(
                taskId, null, execution,
                WorkflowEventType.REPORT_GENERATED,
                "Report version " + nextVersion + " generated: " + report.getTitle(),
                Map.of("reportId", report.getId(), "version", nextVersion)
        );

        workflowEventService.recordEvent(
                taskId, null, execution,
                WorkflowEventType.TASK_COMPLETED,
                "Research task completed successfully.",
                Map.of("reportId", report.getId())
        );

        workflowEventService.completeStream(taskId);

        log.info("Task {} successfully COMPLETED with report version {}", taskId, nextVersion);
    }

    @Transactional
    public void failTask(UUID taskId, String reason) {
        researchTaskRepository.findById(taskId).ifPresent(task -> {
            task.setStatus(TaskStatus.FAILED);
            task.setFailureReason(reason);
            task.setCompletedAt(Instant.now());
            researchTaskRepository.save(task);

            workflowEventService.recordEvent(
                    taskId, null, null,
                    WorkflowEventType.TASK_FAILED,
                    "Task execution failed: " + reason,
                    Map.of("reason", reason)
            );
            workflowEventService.completeStream(taskId);
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

    private UUID extractChunkId(String docUrl) {
        try {
            int idx = docUrl.indexOf("/chunks/");
            if (idx != -1) {
                return UUID.fromString(docUrl.substring(idx + 8));
            }
        } catch (Exception ignored) {}
        return null;
    }

    public record ExecutionClaim(
            UUID executionId,
            String subTaskTitle,
            String subTaskDescription,
            String taskPrompt,
            int attemptNumber
    ) {}
}
