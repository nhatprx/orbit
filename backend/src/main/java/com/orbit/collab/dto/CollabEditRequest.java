package com.orbit.collab.dto;

import com.fasterxml.jackson.databind.JsonNode;

public record CollabEditRequest(String subType, JsonNode payload) {}
