package com.orbit.cloud.event;

import java.util.UUID;

/** Published after a Cloud File upload is finalized and ready in object storage. */
public record CloudFileReadyEvent(UUID nodeId) {}
