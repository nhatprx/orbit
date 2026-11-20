package com.orbit.cloud.dto;

import jakarta.validation.constraints.Size;
import java.util.UUID;

public record UpdateCloudNodeRequest(
    @Size(max = 255, message = "Name must be at most 255 characters.")
    String name,
    UUID parentId,
    Boolean moveToRoot,
    Boolean starred
) {}
