package com.orbit.access.service;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Records that an invitation was issued without logging the recipient or the token. */
@Component
class LoggingInvitationNotifier implements InvitationNotifier {

    private static final Logger LOG = LoggerFactory.getLogger(LoggingInvitationNotifier.class);

    @Override
    public void invitationCreated(UUID invitationId, UUID workspaceId, String recipientEmail) {
        LOG.info("Email invitation {} issued for workspace {} (delivery transport not configured)",
            invitationId, workspaceId);
    }
}
