package com.orbit.access.dto;

import java.util.UUID;

public record AcceptInvitationResponse(
    UUID workspaceId,
    UUID projectId,
    String roleName,
    boolean alreadyMember
) {}
