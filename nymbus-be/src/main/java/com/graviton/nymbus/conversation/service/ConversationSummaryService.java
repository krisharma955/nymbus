package com.graviton.nymbus.conversation.service;

import com.graviton.nymbus.conversation.config.ChatProperties;
import com.graviton.nymbus.conversation.entity.Conversation;
import com.graviton.nymbus.conversation.entity.ConversationMessage;
import com.graviton.nymbus.conversation.repository.ConversationMessageRepository;
import com.graviton.nymbus.conversation.repository.ConversationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationSummaryService {

    private final ConversationRepository conversationRepository;
    private final ConversationMessageRepository conversationMessageRepository;
    private final ChatClient chatClient;
    private final ChatProperties chatProperties;
    @Qualifier("chatExecutor")
    private final Executor chatExecutor;

    private final Set<UUID> activeSummaries = ConcurrentHashMap.newKeySet();

    public void checkAndTriggerSummary(UUID conversationId) {
        long count = conversationMessageRepository.countByConversationId(conversationId);
        if (count >= chatProperties.getSummaryTriggerMessages()) {
            chatExecutor.execute(() -> summarizeConversationAsync(conversationId));
        }
    }

    public void summarizeConversationAsync(UUID conversationId) {
        if (!activeSummaries.add(conversationId)) {
            log.debug("Summary generation already in progress for conversation {}", conversationId);
            return;
        }

        try {
            log.info("Starting asynchronous conversation summary for conversation {}", conversationId);

            Conversation conversation = conversationRepository.findById(conversationId).orElse(null);
            if (conversation == null) {
                return;
            }

            List<ConversationMessage> allMessages = conversationMessageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
            if (allMessages.size() < 6) {
                return;
            }

            StringBuilder historyText = new StringBuilder();
            for (ConversationMessage msg : allMessages) {
                historyText.append(msg.getRole()).append(": ").append(msg.getContent()).append("\n");
            }

            String systemPrompt = """
                    You are the Memory and Summarization Specialist in the Nymbus Research Platform.
                    Your task is to produce an information-dense, structured summary of a research conversation.

                    REQUIREMENTS:
                    1. Retain core user objectives, research topics, constraints, and specific queries.
                    2. Highlight verified facts, key decisions, conclusions, and previous report references.
                    3. Note any unresolved follow-up questions.
                    4. Keep the summary structured and under 3,000 characters.
                    5. Do NOT invent information not present in the dialogue.
                    """;

            String summary = chatClient.prompt()
                    .system(systemPrompt)
                    .user("Conversation Transcript:\n" + historyText)
                    .call()
                    .content();

            if (summary != null && !summary.isBlank()) {
                saveSummary(conversationId, summary.trim());
                log.info("Successfully updated summary for conversation {}", conversationId);
            }
        } catch (Exception e) {
            log.warn("Failed to generate conversation summary for {}: {}", conversationId, e.getMessage());
        } finally {
            activeSummaries.remove(conversationId);
        }
    }

    @Transactional
    public void saveSummary(UUID conversationId, String summary) {
        conversationRepository.findById(conversationId).ifPresent(c -> {
            c.setSummary(summary);
            c.setSummaryUpdatedAt(Instant.now());
            conversationRepository.save(c);
        });
    }
}
