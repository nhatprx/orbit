package com.orbit.chat.service;

import java.util.UUID;

/** Per-user send throttle. Implementations throw an ApiException (429) when the limit is hit. */
@FunctionalInterface
public interface ChatRateLimiter {

    void check(UUID userId);
}
