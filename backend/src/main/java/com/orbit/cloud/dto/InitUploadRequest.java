package com.orbit.cloud.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record InitUploadRequest(
    UUID parentId,
    @NotBlank(message = "File name is required.")
    @Size(max = 255, message = "File name must be at most 255 characters.")
    String name,
    @Size(max = 255, message = "MIME type must be at most 255 characters.")
    String mimeType,
    @Min(value = 0, message = "File size must be non-negative.")
    long sizeBytes
) {}
