package com.orbit.collab.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CollabRoomEvent(
    String type, String resourceKind, UUID resourceId, UUID senderUserId, String senderSessionId,
    String senderDisplayName, long seq, Instant timestamp, List<CollabParticipantDto> participants, JsonNode payload
) {}
