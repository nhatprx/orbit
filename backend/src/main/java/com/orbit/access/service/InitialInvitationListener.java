package com.orbit.access.service;

import com.orbit.workspace.event.WorkspaceCreatedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/** Turns the wizard's optional invite step into pending email invitations, inside the same transaction. */
@Component
class InitialInvitationListener {

    private final InvitationService invitations;

    InitialInvitationListener(InvitationService invitations) {
        this.invitations = invitations;
    }

    @EventListener
    void onWorkspaceCreated(WorkspaceCreatedEvent event) {
        invitations.createInitial(event.workspaceId(), event.creatorId(), event.inviteEmails());
    }
}
