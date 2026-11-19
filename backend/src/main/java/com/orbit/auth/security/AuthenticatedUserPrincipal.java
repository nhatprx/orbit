package com.orbit.auth.security;

import java.util.UUID;

public record AuthenticatedUserPrincipal(
    UUID userId,
    String jti,
    String role,
    String workspaceId
) {}
