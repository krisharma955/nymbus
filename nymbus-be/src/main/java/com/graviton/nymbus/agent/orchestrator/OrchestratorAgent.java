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
                    You are the Orchestrator Agent in the Nymbus Research Platform.
                    Your role is to break down a user's complex research question into a clean, dependency-ordered Directed Acyclic Graph (DAG) of 2 to 4 research subtasks.
                    Each subtask must have:
                    - tempId: e.g. "subtask-1", "subtask-2", etc.
                    - title: concise title of the subtask
                    - description: specific research instructions and query objectives
                    - priority: integer 1 (highest) to 5 (lowest)
                    - dependsOnTempIds: list of tempIds this subtask depends on (empty list for initial tasks)

                    Ensure there are NO cyclical dependencies.
                    Return ONLY a JSON object conforming to:
                    {
                      "overview": "Summary of research strategy",
                      "subTasks": [
                        {
                          "tempId": "subtask-1",
                          "title": "...",
                          "description": "...",
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
