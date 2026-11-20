package com.orbit.storage.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PresignUploadRequest(
    @NotBlank(message = "Prefix is required.")
    String prefix,

    @NotBlank(message = "Filename is required.")
    @Size(max = 255, message = "Filename must be at most 255 characters.")
    String filename,

    @Size(max = 128, message = "Content type must be at most 128 characters.")
    String contentType
) {
}
