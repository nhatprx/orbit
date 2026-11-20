package com.orbit.storage.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PresignDownloadRequest(
    @NotBlank(message = "Object key is required.")
    @Size(max = 512, message = "Object key must be at most 512 characters.")
    String key
) {
}
