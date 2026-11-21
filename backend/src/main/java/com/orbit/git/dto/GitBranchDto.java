package com.orbit.git.dto;

public record GitBranchDto(
    String name,
    String sha,
    boolean isDefault,
    boolean isProtected
) {}
