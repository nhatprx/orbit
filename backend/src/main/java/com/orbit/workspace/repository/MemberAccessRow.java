package com.orbit.workspace.repository;

import java.time.Instant;
import java.util.UUID;

public record MemberAccessRow(UUID roleId, Instant workspaceDeletedAt, UUID ownerId) {}
