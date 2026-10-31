package com.graviton.nymbus.workflow.service;

import com.graviton.nymbus.agent.entity.AgentExecution;
import com.graviton.nymbus.research.entity.ResearchTask;
import com.graviton.nymbus.research.entity.TaskStatus;
import com.graviton.nymbus.research.repository.ResearchTaskRepository;
import com.graviton.nymbus.workflow.entity.SubTask;
import com.graviton.nymbus.workflow.entity.WorkflowEvent;
import com.graviton.nymbus.workflow.entity.WorkflowEventType;
import com.graviton.nymbus.workflow.repository.WorkflowEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowEventService {

    private final WorkflowEventRepository workflowEventRepository;
    private final ResearchTaskRepository researchTaskRepository;

    // Active SSE subscriptions per task ID
    private final Map<UUID, List<SseEmitter>> taskEmitters = new ConcurrentHashMap<>();

    @Transactional
    public WorkflowEvent recordEvent(
            UUID researchTaskId,
            SubTask subTask,
            AgentExecution agentExecution,
            WorkflowEventType eventType,
            String message,
            Map<String, Object> metadata) {

        ResearchTask task = researchTaskRepository.findById(researchTaskId).orElseThrow();

        WorkflowEvent event = WorkflowEvent.builder()
                .researchTask(task)
                .subTask(subTask)
                .agentExecution(agentExecution)
                .eventType(eventType)
                .message(message)
                .metadata(metadata)
                .build();

        event = workflowEventRepository.save(event);
        log.info("WorkflowEvent [{}] for task {}: {}", eventType, researchTaskId, message);

        broadcastEvent(researchTaskId, event);
        return event;
    }

    @Transactional(readOnly = true)
    public List<WorkflowEvent> getEvents(UUID taskId) {
        return workflowEventRepository.findByResearchTaskIdOrderByCreatedAtAsc(taskId);
    }

    public SseEmitter subscribe(UUID taskId, UUID lastEventId) {
        // 5-minute timeout for client connection
        SseEmitter emitter = new SseEmitter(300_000L);

        taskEmitters.computeIfAbsent(taskId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(taskId, emitter));
        emitter.onTimeout(() -> removeEmitter(taskId, emitter));
        emitter.onError(e -> removeEmitter(taskId, emitter));

        // Send initial connect handshake
        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data(Map.of("taskId", taskId, "status", "CONNECTED")));
        } catch (IOException e) {
            removeEmitter(taskId, emitter);
            return emitter;
        }

        // Replay events:
        // If lastEventId is provided, replay from that event onwards.
        // If lastEventId is null, replay all events so far so client gets immediate status.
        List<WorkflowEvent> replayEvents;
        if (lastEventId != null) {
            replayEvents = workflowEventRepository.findById(lastEventId)
                    .map(lastEvent -> workflowEventRepository
                            .findByResearchTaskIdAndCreatedAtGreaterThanOrderByCreatedAtAsc(taskId, lastEvent.getCreatedAt()))
                    .orElseGet(() -> workflowEventRepository.findByResearchTaskIdOrderByCreatedAtAsc(taskId));
        } else {
            replayEvents = workflowEventRepository.findByResearchTaskIdOrderByCreatedAtAsc(taskId);
        }

        for (WorkflowEvent ev : replayEvents) {
            sendToEmitter(emitter, ev);
        }

        // If the task has already reached a terminal state (COMPLETED or FAILED), close the stream
        researchTaskRepository.findById(taskId).ifPresent(task -> {
            if (task.getStatus() == TaskStatus.COMPLETED || task.getStatus() == TaskStatus.FAILED) {
                try {
                    emitter.complete();
                } catch (Exception ignored) {}
            }
        });

        return emitter;
    }

    public void completeStream(UUID taskId) {
        List<SseEmitter> emitters = taskEmitters.remove(taskId);
        if (emitters != null) {
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.complete();
                } catch (Exception ignored) {}
            }
        }
    }

    private void broadcastEvent(UUID taskId, WorkflowEvent event) {
        List<SseEmitter> emitters = taskEmitters.get(taskId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }

        for (SseEmitter emitter : emitters) {
            sendToEmitter(emitter, event);
        }
    }

    private void sendToEmitter(SseEmitter emitter, WorkflowEvent event) {
        try {
            emitter.send(SseEmitter.event()
                    .id(event.getId().toString())
                    .name(event.getEventType().name())
                    .data(Map.of(
                            "id", event.getId(),
                            "eventType", event.getEventType().name(),
                            "message", event.getMessage() != null ? event.getMessage() : "",
                            "timestamp", event.getCreatedAt(),
                            "metadata", event.getMetadata() != null ? event.getMetadata() : Collections.emptyMap()
                    )));
        } catch (Exception e) {
            log.debug("Failed to send SSE event, removing dead emitter: {}", e.getMessage());
            emitter.complete();
        }
    }

    private void removeEmitter(UUID taskId, SseEmitter emitter) {
        List<SseEmitter> list = taskEmitters.get(taskId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                taskEmitters.remove(taskId);
            }
        }
    }
}
