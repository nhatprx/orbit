package com.orbit.cloud.dto;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record SaveTextContentRequest(
    @NotNull String content,
    Instant expectedUpdatedAt
) {}
