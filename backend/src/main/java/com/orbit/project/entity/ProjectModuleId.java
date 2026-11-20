package com.orbit.project.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.UUID;

@Embeddable
public record ProjectModuleId(
    @Column(name = "project_id") UUID projectId,
    @Column(name = "module_key") String moduleKey
) implements Serializable {}
