package com.orbit.workspace.permission;

import java.util.HashSet;
import java.util.Set;

/**
 * Pure rule for the Workspace-to-Project access model (O-04):
 * explicit project role permissions, project.view for any explicit project member,
 * read access with workspace project.view_all, and full project administration for
 * Workspace owners and holders of workspace.edit.
 */
public final class ProjectPermissionPolicy {

    private ProjectPermissionPolicy() {}

    public static Set<String> effective(
        Set<String> workspacePermissions,
        boolean workspaceOwner,
        boolean projectMember,
        Set<String> explicitProjectPermissions
    ) {
        Set<String> result = new HashSet<>(explicitProjectPermissions);
        if (projectMember) {
            result.add(Permissions.PROJECT_VIEW);
        }
        if (workspacePermissions.contains(Permissions.PROJECT_VIEW_ALL)) {
            result.add(Permissions.PROJECT_VIEW);
            result.add(Permissions.PCHAT_READ);
            result.add(Permissions.PFILES_READ);
            result.add(Permissions.PGIT_READ);
            result.add(Permissions.PISSUES_READ);
            result.add(Permissions.PWHITEBOARD_READ);
        }
        if (workspaceOwner || workspacePermissions.contains(Permissions.WORKSPACE_EDIT)) {
            result.addAll(Permissions.PROJECT_KEYS);
        }
        return result;
    }

    /** True when the caller may list every Project of the Workspace without explicit membership. */
    public static boolean canSeeAllProjects(Set<String> workspacePermissions, boolean workspaceOwner) {
        return workspaceOwner
            || workspacePermissions.contains(Permissions.PROJECT_VIEW_ALL)
            || workspacePermissions.contains(Permissions.WORKSPACE_EDIT);
    }
}
