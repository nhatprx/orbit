package com.orbit.git.dto;

public record CreateGitRepoRequest(
    String accessToken,
    String repoName,
    String description,
    boolean privateRepo,
    Boolean autoInit,
    String gitignoreTemplate,
    String licenseTemplate
) {
    public CreateGitRepoRequest(String accessToken, String repoName, String description, boolean privateRepo) {
        this(accessToken, repoName, description, privateRepo, true, null, null);
    }
}
