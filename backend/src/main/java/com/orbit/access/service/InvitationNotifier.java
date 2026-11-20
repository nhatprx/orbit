package com.orbit.access.service;

import java.util.UUID;

/** Delivery seam for email invitations. No SMTP is wired yet (see LoggingInvitationNotifier). */
public interface InvitationNotifier {

    void invitationCreated(UUID invitationId, UUID workspaceId, String recipientEmail);
}
