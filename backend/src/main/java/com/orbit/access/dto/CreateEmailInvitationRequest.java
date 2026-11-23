package com.orbit.access.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreateEmailInvitationRequest(
    @NotBlank(message = "Email or username is required.")
    @Size(max = 255, message = "Email or username must be at most 255 characters.")
    String email,

    UUID roleId,
    UUID projectId
) {}
