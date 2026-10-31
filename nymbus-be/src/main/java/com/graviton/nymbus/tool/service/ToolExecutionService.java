package com.graviton.nymbus.tool.service;

import com.graviton.nymbus.agent.entity.AgentExecution;
import com.graviton.nymbus.agent.repository.AgentExecutionRepository;
import com.graviton.nymbus.tool.entity.ToolExecution;
import com.graviton.nymbus.tool.entity.ToolExecutionStatus;
import com.graviton.nymbus.tool.repository.ToolExecutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ToolExecutionService {

    private final ToolExecutionRepository toolExecutionRepository;
    private final AgentExecutionRepository agentExecutionRepository;

    @Transactional
    public UUID startToolExecution(UUID agentExecutionId, String toolName, Map<String, Object> inputSummary) {
        AgentExecution exec = agentExecutionRepository.findById(agentExecutionId).orElseThrow();

        ToolExecution te = ToolExecution.builder()
                .agentExecution(exec)
                .toolName(toolName)
                .status(ToolExecutionStatus.STARTED)
                .inputSummary(inputSummary)
                .build();

        te = toolExecutionRepository.save(te);
        return te.getId();
    }

    @Transactional
    public void completeToolExecution(UUID toolExecutionId, Map<String, Object> outputSummary, long durationMs) {
        toolExecutionRepository.findById(toolExecutionId).ifPresent(te -> {
            te.setStatus(ToolExecutionStatus.SUCCEEDED);
            te.setOutputSummary(outputSummary);
            te.setDurationMs(durationMs);
            te.setCompletedAt(Instant.now());
            toolExecutionRepository.save(te);
        });
    }

    @Transactional
    public void failToolExecution(UUID toolExecutionId, String errorMessage, long durationMs) {
        toolExecutionRepository.findById(toolExecutionId).ifPresent(te -> {
            te.setStatus(ToolExecutionStatus.FAILED);
            te.setErrorMessage(errorMessage);
            te.setDurationMs(durationMs);
            te.setCompletedAt(Instant.now());
            toolExecutionRepository.save(te);
        });
    }
}
