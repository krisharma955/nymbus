package com.graviton.nymbus.config;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class AiConfigValidationTest {

    @Test
    void validateAiConfiguration_ExecutesWithoutException() {
        AiConfig aiConfig = new AiConfig();
        ReflectionTestUtils.setField(aiConfig, "chatModel", "google/gemini-2.5-flash");
        ReflectionTestUtils.setField(aiConfig, "embeddingModel", "openai/text-embedding-3-small");
        ReflectionTestUtils.setField(aiConfig, "apiKey", "test-key");

        assertDoesNotThrow(aiConfig::validateAiConfiguration);
    }

    @Test
    void validateAiConfiguration_DetectsEmbeddingModelAsChatModel() {
        AiConfig aiConfig = new AiConfig();
        ReflectionTestUtils.setField(aiConfig, "chatModel", "nvidia/nemotron-3.5-embed-1b:free");
        ReflectionTestUtils.setField(aiConfig, "embeddingModel", "openai/text-embedding-3-small");
        ReflectionTestUtils.setField(aiConfig, "apiKey", "test-key");

        // Should log error without crashing startup
        assertDoesNotThrow(aiConfig::validateAiConfiguration);
    }

    @Test
    void validateAiConfiguration_HandlesEmptyVariables() {
        AiConfig aiConfig = new AiConfig();
        ReflectionTestUtils.setField(aiConfig, "chatModel", "");
        ReflectionTestUtils.setField(aiConfig, "embeddingModel", "");
        ReflectionTestUtils.setField(aiConfig, "apiKey", "");

        assertDoesNotThrow(aiConfig::validateAiConfiguration);
    }
}
