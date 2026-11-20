package com.orbit.support;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.junit.jupiter.api.condition.EnabledIf;

/** Skips a test class when no Docker daemon is reachable (Testcontainers needs one). */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@EnabledIf(
    value = "com.orbit.support.DockerAvailability#available",
    disabledReason = "Docker is required for Testcontainers integration tests."
)
public @interface RequiresDocker {}
