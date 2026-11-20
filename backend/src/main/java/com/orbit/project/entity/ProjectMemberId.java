package com.orbit.project.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.UUID;

@Embeddable
public record ProjectMemberId(
    @Column(name = "project_id") UUID projectId,
    @Column(name = "user_id") UUID userId
) implements Serializable {}
