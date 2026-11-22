package com.orbit.cloud.dto;

import java.util.UUID;

public record CloudBreadcrumbItem(UUID id, String name, boolean locked, boolean effectiveLocked) {
    public CloudBreadcrumbItem(UUID id, String name) { this(id, name, false, false); }
}
