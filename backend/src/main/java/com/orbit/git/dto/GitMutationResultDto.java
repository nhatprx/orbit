package com.orbit.git.dto;

public record GitMutationResultDto(
    GitFileContentDto file,
    GitCommitDto commit
) {}
