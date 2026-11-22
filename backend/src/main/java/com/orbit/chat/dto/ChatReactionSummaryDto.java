package com.orbit.chat.dto;

import java.util.UUID;

public record ChatReactionSummaryDto(UUID messageId, String reactionKey, long count, boolean reactedByMe) { }
