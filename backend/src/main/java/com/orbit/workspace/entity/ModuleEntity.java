package com.orbit.workspace.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "modules")
public class ModuleEntity {

    @Id
    @Column(name = "module_key", length = 32)
    private String moduleKey;

    @Column(nullable = false, length = 64)
    private String name;

    @Column(nullable = false, length = 255)
    private String description;

    @Column(nullable = false, length = 16)
    private String scope;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected ModuleEntity() {}

    public String getModuleKey() { return moduleKey; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getScope() { return scope; }
    public int getSortOrder() { return sortOrder; }
}
