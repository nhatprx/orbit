package com.orbit.common;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/** PostgreSQL stores microsecond precision; truncating keeps API values stable across reads. */
public final class Timestamps {

    private Timestamps() {}

    public static Instant now() {
        return Instant.now().truncatedTo(ChronoUnit.MICROS);
    }
}
