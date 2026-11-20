package com.orbit.workspace.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.UUID;

@Embeddable
public record WorkspaceModuleId(
    @Column(name = "workspace_id") UUID workspaceId,
    @Column(name = "module_key") String moduleKey
) implements Serializable {}
