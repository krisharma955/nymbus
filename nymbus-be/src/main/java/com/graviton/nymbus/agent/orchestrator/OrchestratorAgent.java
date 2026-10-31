package com.graviton.nymbus.agent.orchestrator;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.graviton.nymbus.agent.dto.PlanOutput;
import com.graviton.nymbus.agent.dto.PlannedSubTaskDto;
import com.graviton.nymbus.workflow.service.DagValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrchestratorAgent {

    private final ChatClient chatClient;
    private final DagValidator dagValidator;
    private final ObjectMapper objectMapper;

    public PlanOutput plan(String taskTitle, String taskPrompt) {
        log.info("OrchestratorAgent planning for task: '{}'", taskTitle);

        try {
            String systemPrompt = """
                    You are the Lead Research Strategist and Orchestrator Agent in the Nymbus Autonomous Research Platform.
                    Your objective is to decompose a complex, multifaceted research inquiry into an exhaustive, highly structured, dependency-ordered Directed Acyclic Graph (DAG) of 3 to 5 comprehensive research subtasks.
                    
                    PLANNING & STRUCTURAL REQUIREMENTS:
                    1. Exhaustive Decomposition: Avoid shallow, high-level task summaries. Design a rigorous investigation addressing foundational context, quantitative and empirical metrics, comparative or contrasting viewpoints, technological or regulatory mechanics, and forward-looking strategic implications.
                    2. Research Overview: In the "overview" field, articulate an in-depth, multi-paragraph strategic roadmap. Detail the theoretical and practical scope of the inquiry, key methodological angles, risk dimensions, and expected evidentiary deliverables.
                    3. Detailed SubTask Directives: For EACH subtask:
                       - "tempId": Unique string identifier (e.g., "subtask-1", "subtask-2", etc.).
                       - "title": Highly descriptive, professional research title.
                       - "description": An exhaustive, explicit research specification. Detail the precise questions to answer, targeted metrics, benchmarks, technical concepts, data points to extract, and specific investigative criteria.
                       - "priority": Integer from 1 (highest/critical foundation) to 5 (lowest).
                       - "dependsOnTempIds": Explicit list of prerequisite subtask tempIds required before this subtask can execute (empty list for initial foundation tasks).
                    4. Strict DAG Validation: Ensure the execution graph is strictly acyclic with valid logical dependency order.
                    
                    Return ONLY a JSON object conforming strictly to:
                    {
                      "overview": "Exhaustive, multi-paragraph strategic research roadmap and scope analysis...",
                      "subTasks": [
                        {
                          "tempId": "subtask-1",
                          "title": "...",
                          "description": "Exhaustive research directives, target questions, and metrics to uncover...",
                          "priority": 1,
                          "dependsOnTempIds": []
                        }
                      ]
                    }
                    """;

            String userMessage = "Research Title: " + taskTitle + "\nResearch Prompt: " + taskPrompt;

            String responseContent = chatClient.prompt()
                    .system(systemPrompt)
                    .user(userMessage)
                    .call()
                    .content();

            if (responseContent != null && !responseContent.isBlank()) {
                String cleanJson = extractJson(responseContent);
                PlanOutput planOutput = objectMapper.readValue(cleanJson, PlanOutput.class);
                DagValidator.ValidationResult result = dagValidator.validate(planOutput.subTasks());
                if (result.isValid()) {
                    log.info("OrchestratorAgent produced valid DAG with {} subtasks", planOutput.subTasks().size());
                    return planOutput;
                } else {
                    log.warn("Generated plan failed DAG validation: {}. Falling back to default plan.", result.errorMessage());
                }
            }
        } catch (Exception e) {
            log.warn("LLM call failed in OrchestratorAgent: {}. Generating deterministic fallback plan.", e.getMessage());
        }

        return createFallbackPlan(taskTitle, taskPrompt);
    }

    private PlanOutput createFallbackPlan(String title, String prompt) {
        List<PlannedSubTaskDto> subTasks = new ArrayList<>();
        subTasks.add(new PlannedSubTaskDto(
                "task-1",
                "Foundational background and overview of " + title,
                "Investigate the primary background, definitions, and landscape for: " + prompt,
                1,
                List.of()
        ));
        subTasks.add(new PlannedSubTaskDto(
                "task-2",
                "Key developments, metrics, and evidence for " + title,
                "Extract specific quantitative data, recent developments, and comparative evidence for: " + prompt,
                2,
                List.of("task-1")
        ));
        subTasks.add(new PlannedSubTaskDto(
                "task-3",
                "Synthesis, implications, and future outlook for " + title,
                "Synthesize findings, identify risks, and articulate future projections based on gathered evidence for: " + prompt,
                3,
                List.of("task-2")
        ));

        return new PlanOutput(
                "Structured 3-stage research plan: Background -> Evidence Gathering -> Synthesis & Implications",
                subTasks
        );
    }

    private String extractJson(String text) {
        String trimmed = text.trim();
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        return trimmed.trim();
    }
}
