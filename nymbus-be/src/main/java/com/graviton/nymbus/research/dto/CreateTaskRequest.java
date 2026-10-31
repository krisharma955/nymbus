package com.graviton.nymbus.research.dto;

import com.graviton.nymbus.research.entity.ExecutionMode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateTaskRequest(
        @NotBlank(message = "Title is required")
        @Size(max = 250, message = "Title must not exceed 250 characters")
        String title,

        @NotBlank(message = "Prompt is required")
        String prompt,

        ExecutionMode executionMode,
        Integer tokenBudget,
        BigDecimal costBudgetUsd
) {}
