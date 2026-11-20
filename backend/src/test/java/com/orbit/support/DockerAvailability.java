package com.orbit.support;

import org.testcontainers.DockerClientFactory;

public final class DockerAvailability {

    private DockerAvailability() {}

    public static boolean available() {
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (Throwable ex) {
            return false;
        }
    }
}
