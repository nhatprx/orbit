package com.orbit.workspace.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateWorkspaceRequest(
    @NotBlank(message = "Workspace name is required.")
    @Size(max = 100, message = "Workspace name must be at most 100 characters.")
    String name,

    @Size(max = 500, message = "Description must be at most 500 characters.")
    String description,

    @Size(max = 500, message = "Avatar URL must be at most 500 characters.")
    String avatarUrl,

    @NotEmpty(message = "Select at least one module.")
    @Size(max = 16, message = "Too many modules selected.")
    List<@NotBlank String> moduleKeys,

    @Size(max = 50, message = "At most 50 invitations can be sent during creation.")
    List<@NotBlank @Email @Size(max = 255) String> inviteEmails
) {}
