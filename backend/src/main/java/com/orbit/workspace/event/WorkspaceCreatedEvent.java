package com.orbit.workspace.event;

import java.util.List;
import java.util.UUID;

/** Published inside the creating transaction so listeners stay atomic with the Workspace. */
public record WorkspaceCreatedEvent(
    UUID workspaceId,
    UUID creatorId,
    List<String> inviteEmails,
    boolean chatEnabled
) {}
