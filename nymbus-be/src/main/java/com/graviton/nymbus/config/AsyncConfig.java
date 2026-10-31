package com.graviton.nymbus.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "workflowExecutor")
    public Executor workflowExecutor(
            @Value("${nymbus.workflow.max-concurrent-subtasks:3}") int maxConcurrent) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(maxConcurrent);
        executor.setMaxPoolSize(maxConcurrent * 2);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("workflow-worker-");
        executor.initialize();
        return executor;
    }

}
