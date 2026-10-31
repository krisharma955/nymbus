package com.graviton.nymbus.conversation.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
@ConfigurationProperties(prefix = "nymbus.chat")
@Getter
@Setter
public class ChatProperties {

    private int maxContextChars = 24000;
    private int maxHistoryMessages = 20;
    private int summaryTriggerMessages = 24;
    private int summaryMaxChars = 3000;
    private Duration docReadinessTimeout = Duration.ofMillis(8000);
    private Duration bgDocReadinessTimeout = Duration.ofSeconds(60);
    private int maxSearchQueries = 2;
    private int maxSearchResults = 4;
    private double maxVectorDistance = 0.70;
    private int retrievedChunkCount = 8;
}
