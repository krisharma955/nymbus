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
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    @Bean(name = "chatExecutor")
    public Executor chatExecutor(
            @Value("${nymbus.chat.executor.core-pool-size:4}") int corePoolSize,
            @Value("${nymbus.chat.executor.max-pool-size:8}") int maxPoolSize,
            @Value("${nymbus.chat.executor.queue-capacity:200}") int queueCapacity) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setThreadNamePrefix("chat-worker-");
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    @Bean(name = "documentExecutor")
    public Executor documentExecutor(
            @Value("${nymbus.document.executor.core-pool-size:2}") int corePoolSize,
            @Value("${nymbus.document.executor.max-pool-size:4}") int maxPoolSize,
            @Value("${nymbus.document.executor.queue-capacity:100}") int queueCapacity) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setThreadNamePrefix("doc-ingest-");
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

}
