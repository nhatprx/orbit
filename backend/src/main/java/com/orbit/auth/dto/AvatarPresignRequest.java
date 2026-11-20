package com.orbit.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AvatarPresignRequest(
    @NotBlank(message = "Filename is required.")
    @Size(max = 255, message = "Filename must be at most 255 characters.")
    String filename,

    @NotBlank(message = "Content type is required.")
    @Size(max = 128, message = "Content type must be at most 128 characters.")
    String contentType,

    @NotNull(message = "File size is required.")
    Long fileSize
) {
}
