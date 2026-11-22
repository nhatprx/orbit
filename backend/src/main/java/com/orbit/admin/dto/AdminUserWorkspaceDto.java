package com.orbit.admin.dto;

import java.util.UUID;

public record AdminUserWorkspaceDto(UUID id, String name, String roleName, boolean owner) {}
