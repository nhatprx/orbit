package com.orbit.workspace.permission;

import java.util.LinkedHashSet;
import java.util.Set;

/** Seeded system roles. Names are locked; only {@link #OWNER} is fully immutable. */
public enum SystemRole {
    OWNER("Owner", true),
    ADMIN("Admin", false),
    MEMBER("Member", false);

    private final String displayName;
    private final boolean immutable;

    SystemRole(String displayName, boolean immutable) {
        this.displayName = displayName;
        this.immutable = immutable;
    }

    public String displayName() {
        return displayName;
    }

    public boolean immutable() {
        return immutable;
    }

    public Set<String> workspacePermissions() {
        return switch (this) {
            case OWNER -> new LinkedHashSet<>(Permissions.WORKSPACE_KEYS);
            case ADMIN -> {
                Set<String> keys = new LinkedHashSet<>(Permissions.WORKSPACE_KEYS);
                keys.remove(Permissions.WORKSPACE_DELETE);
                keys.remove(Permissions.WORKSPACE_TRANSFER_OWNER);
                yield keys;
            }
            case MEMBER -> new LinkedHashSet<>(Set.of(
                Permissions.WORKSPACE_VIEW,
                Permissions.MEMBER_VIEW,
                Permissions.ROLE_VIEW,
                Permissions.PROJECT_CREATE,
                Permissions.CHAT_READ,
                Permissions.CHAT_WRITE,
                Permissions.FILES_READ,
                Permissions.FILES_WRITE,
                Permissions.FILES_DELETE,
                Permissions.GIT_READ,
                Permissions.GIT_WRITE,
                Permissions.GIT_DELETE,
                Permissions.ISSUES_READ,
                Permissions.ISSUES_WRITE,
                Permissions.ISSUES_DELETE
            ));
        };
    }

    public Set<String> projectPermissions() {
        return switch (this) {
            case OWNER -> new LinkedHashSet<>(Permissions.PROJECT_KEYS);
            case ADMIN -> {
                Set<String> keys = new LinkedHashSet<>(Permissions.PROJECT_KEYS);
                keys.remove(Permissions.PROJECT_DELETE);
                yield keys;
            }
            case MEMBER -> new LinkedHashSet<>(Set.of(
                Permissions.PROJECT_VIEW,
                Permissions.PCHAT_READ,
                Permissions.PCHAT_WRITE,
                Permissions.PFILES_READ,
                Permissions.PFILES_WRITE,
                Permissions.PFILES_DELETE,
                Permissions.PGIT_READ,
                Permissions.PGIT_WRITE,
                Permissions.PGIT_DELETE,
                Permissions.PISSUES_READ,
                Permissions.PISSUES_WRITE,
                Permissions.PISSUES_DELETE
            ));
        };
    }
}
