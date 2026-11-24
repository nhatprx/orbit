package com.orbit.git.dto;

/** Repository collaborator returned by the GitHub REST API. */
public record GitCollaboratorDto(
    String login,
    String avatarUrl,
    String htmlUrl,
    String roleName
) {}
