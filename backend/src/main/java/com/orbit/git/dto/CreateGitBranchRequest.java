package com.orbit.git.dto;

public record CreateGitBranchRequest(
    String branchName,
    String sourceBranch
) {}
