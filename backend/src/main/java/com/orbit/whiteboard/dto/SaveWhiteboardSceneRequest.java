package com.orbit.whiteboard.dto;

import com.fasterxml.jackson.databind.JsonNode;

public record SaveWhiteboardSceneRequest(
    Long expectedVersion,
    JsonNode sceneJson,
    Integer elementCount
) {}
