package com.orbit.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendAiPromptRequest(
    @NotBlank(message = "Prompt cannot be empty.")
    @Size(max = 8000, message = "Prompt must be at most 8000 characters.")
    String prompt,
    String model,
    Boolean webSearch
) {}
