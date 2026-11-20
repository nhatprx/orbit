package com.orbit.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateAvatarRequest(
    @NotBlank(message = "Avatar storage key is required.")
    @Size(max = 512, message = "Avatar storage key must be at most 512 characters.")
    String key
) {
}
