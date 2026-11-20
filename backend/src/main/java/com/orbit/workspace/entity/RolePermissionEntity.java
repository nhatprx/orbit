package com.orbit.workspace.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "role_permissions")
public class RolePermissionEntity {

    @Id
    private UUID id;

    @Column(name = "role_id", nullable = false)
    private UUID roleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_scope", nullable = false, length = 16)
    private RoleScope roleScope;

    @Column(name = "permission_key", nullable = false, length = 64)
    private String permissionKey;

    protected RolePermissionEntity() {}

    public RolePermissionEntity(UUID roleId, RoleScope roleScope, String permissionKey) {
        this.roleId = roleId;
        this.roleScope = roleScope;
        this.permissionKey = permissionKey;
    }

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
    }

    public UUID getId() { return id; }
    public UUID getRoleId() { return roleId; }
    public RoleScope getRoleScope() { return roleScope; }
    public String getPermissionKey() { return permissionKey; }
}
