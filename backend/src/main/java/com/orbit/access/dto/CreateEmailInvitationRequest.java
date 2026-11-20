package com.orbit.access.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreateEmailInvitationRequest(
    @NotBlank(message = "Email is required.")
    @Email(message = "Email must be valid.")
    @Size(max = 255, message = "Email must be at most 255 characters.")
    String email,

    UUID roleId,
    UUID projectId
) {}
