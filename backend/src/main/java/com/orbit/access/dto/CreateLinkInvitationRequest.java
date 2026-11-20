package com.orbit.access.dto;

import java.util.UUID;

public record CreateLinkInvitationRequest(UUID roleId, UUID projectId) {}
