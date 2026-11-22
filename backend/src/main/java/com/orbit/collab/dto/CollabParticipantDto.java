package com.orbit.collab.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.UUID;

public record CollabParticipantDto(
    UUID userId, String sessionId, String displayName, String color, JsonNode cursor, Instant updatedAt
) {}
