package com.orbit.git.dto;

import java.util.List;

public record InspectGitTokenResponse(
    String username,
    String displayName,
    List<String> scopes,
    List<GitHubRemoteRepoDto> repositories
) {}
