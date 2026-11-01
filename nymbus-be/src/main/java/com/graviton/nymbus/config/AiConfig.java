package com.graviton.nymbus.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

@Slf4j
@Configuration
public class AiConfig {

    @Value("${spring.ai.openai.chat.options.model:}")
    private String chatModel;

    @Value("${spring.ai.openai.embedding.options.model:}")
    private String embeddingModel;

    @Value("${spring.ai.openai.api-key:}")
    private String apiKey;

    @PostConstruct
    public void validateAiConfiguration() {
        if (!StringUtils.hasText(apiKey)) {
            log.warn("AiConfig: OpenAI/OpenRouter API key is missing or blank. Conversational AI and embedding generation will fail at runtime.");
        }

        if (!StringUtils.hasText(chatModel)) {
            log.error("AiConfig: Chat model is empty! Please configure OPENROUTER_MODEL.");
        } else {
            String lowerChatModel = chatModel.toLowerCase();
            if (lowerChatModel.contains("embed") || lowerChatModel.contains("embedding")) {
                log.error("AiConfig: CRITICAL CONFIGURATION ERROR: Chat model '{}' appears to be an embedding model, not a conversational chat model! Chat completions will be rejected by OpenRouter/OpenAI.", chatModel);
            }
        }

        if (!StringUtils.hasText(embeddingModel)) {
            log.warn("AiConfig: Embedding model is empty. Document vector embeddings may fail.");
        }

        if (StringUtils.hasText(chatModel) && StringUtils.hasText(embeddingModel) && chatModel.equalsIgnoreCase(embeddingModel)) {
            log.error("AiConfig: CRITICAL CONFIGURATION ERROR: Chat model and embedding model are both set to '{}'. Chat and embedding operations require distinct models.", chatModel);
        }

        log.info("AiConfig initialized: Chat model='{}', Embedding model='{}'", chatModel, embeddingModel);
    }

    @Bean
    public ChatClient chatClient(ChatModel chatModel) {
        return ChatClient.builder(chatModel).build();
    }

}
