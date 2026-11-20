package com.orbit.access.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record RoleDto(
    UUID id,
    String scope,
    String name,
    boolean system,
    boolean immutable,
    List<String> permissions,
    long memberCount,
    Instant createdAt
) {}
