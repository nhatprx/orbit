package com.orbit.collab.dto;

import com.fasterxml.jackson.databind.JsonNode;

public record CollabPresenceRequest(String action, JsonNode cursor) {}
