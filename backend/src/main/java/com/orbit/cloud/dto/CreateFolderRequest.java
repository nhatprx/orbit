package com.orbit.cloud.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreateFolderRequest(
    UUID parentId,
    @NotBlank(message = "Folder name is required.")
    @Size(max = 255, message = "Folder name must be at most 255 characters.")
    String name
) {}
