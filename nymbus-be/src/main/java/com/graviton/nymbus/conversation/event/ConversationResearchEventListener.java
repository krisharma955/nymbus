package com.graviton.nymbus.conversation.event;

import com.graviton.nymbus.conversation.entity.ConversationMessage;
import com.graviton.nymbus.conversation.entity.MessageStatus;
import com.graviton.nymbus.conversation.repository.ConversationMessageRepository;
import com.graviton.nymbus.research.event.ResearchTaskCompletedEvent;
import com.graviton.nymbus.research.event.ResearchTaskFailedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class ConversationResearchEventListener {

    private final ConversationMessageRepository conversationMessageRepository;

    @EventListener
    @Transactional
    public void onResearchCompleted(ResearchTaskCompletedEvent event) {
        log.info("Handling ResearchTaskCompletedEvent for task: {}, report: {}", event.taskId(), event.reportId());
        java.util.List<ConversationMessage> msgs = conversationMessageRepository.findByResearchTaskId(event.taskId());
        if (msgs == null || msgs.isEmpty()) {
            log.warn("No conversation message found associated with research task {}", event.taskId());
            return;
        }

        for (ConversationMessage msg : msgs) {
            msg.setStatus(MessageStatus.COMPLETED);

            Map<String, Object> metadata = msg.getMetadata() != null ? new HashMap<>(msg.getMetadata()) : new HashMap<>();
            Map<String, Object> researchMeta = new HashMap<>();
            researchMeta.put("taskId", event.taskId().toString());
            researchMeta.put("reportId", event.reportId().toString());
            researchMeta.put("status", "COMPLETED");
            researchMeta.put("title", event.reportTitle());
            researchMeta.put("executiveSummary", event.executiveSummary() != null ? event.executiveSummary() : "");
            metadata.put("research", researchMeta);
            msg.setMetadata(metadata);

            conversationMessageRepository.save(msg);
            log.info("Updated conversation message {} with completed research report metadata", msg.getId());
        }
    }

    @EventListener
    @Transactional
    public void onResearchFailed(ResearchTaskFailedEvent event) {
        log.info("Handling ResearchTaskFailedEvent for task: {}", event.taskId());
        java.util.List<ConversationMessage> msgs = conversationMessageRepository.findByResearchTaskId(event.taskId());
        if (msgs == null || msgs.isEmpty()) {
            log.warn("No conversation message found associated with failed research task {}", event.taskId());
            return;
        }

        for (ConversationMessage msg : msgs) {
            msg.setStatus(MessageStatus.FAILED);

            Map<String, Object> metadata = msg.getMetadata() != null ? new HashMap<>(msg.getMetadata()) : new HashMap<>();
            Map<String, Object> researchMeta = new HashMap<>();
            researchMeta.put("taskId", event.taskId().toString());
            researchMeta.put("status", "FAILED");
            researchMeta.put("error", event.errorMessage() != null ? event.errorMessage() : "Research execution failed");
            metadata.put("research", researchMeta);
            msg.setMetadata(metadata);

            conversationMessageRepository.save(msg);
            log.info("Updated conversation message {} with failed research status", msg.getId());
        }
    }
}
