package com.orbit.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.ProjectPermissionPolicy;
import com.orbit.workspace.permission.SystemRole;
import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class PermissionModelTest {

    @Test
    void keyCatalogsHaveNoDuplicatesAndDoNotOverlap() {
        assertEquals(20, Permissions.WORKSPACE_KEYS.size());
        assertEquals(13, Permissions.PROJECT_KEYS.size());
        assertEquals(20, new HashSet<>(Permissions.WORKSPACE_KEYS).size());
        assertEquals(13, new HashSet<>(Permissions.PROJECT_KEYS).size());
        Set<String> overlap = new HashSet<>(Permissions.WORKSPACE_KEYS);
        overlap.retainAll(Permissions.PROJECT_KEYS);
        assertTrue(overlap.isEmpty());
    }

    @Test
    void keyValidationIsScopeSpecificAndNullSafe() {
        assertTrue(Permissions.isWorkspaceKey("workspace.view"));
        assertFalse(Permissions.isWorkspaceKey("project.view"));
        assertTrue(Permissions.isProjectKey("project.view"));
        assertFalse(Permissions.isProjectKey("workspace.view"));
        assertFalse(Permissions.isWorkspaceKey(null));
        assertFalse(Permissions.isProjectKey(""));
        assertFalse(Permissions.isWorkspaceKey("WORKSPACE.VIEW"));
    }

    @Test
    void seededWorkspaceRolesMatchTheSpecification() {
        assertEquals(20, SystemRole.OWNER.workspacePermissions().size());
        Set<String> admin = SystemRole.ADMIN.workspacePermissions();
        assertEquals(18, admin.size());
        assertFalse(admin.contains(Permissions.WORKSPACE_DELETE));
        assertFalse(admin.contains(Permissions.WORKSPACE_TRANSFER_OWNER));
        assertEquals(
            Set.of("workspace.view", "member.view", "role.view", "project.create", "chat.read", "chat.write"),
            SystemRole.MEMBER.workspacePermissions()
        );
        assertTrue(SystemRole.OWNER.immutable());
        assertFalse(SystemRole.ADMIN.immutable());
    }

    @Test
    void seededProjectRolesMatchTheSpecification() {
        assertEquals(13, SystemRole.OWNER.projectPermissions().size());
        Set<String> admin = SystemRole.ADMIN.projectPermissions();
        assertEquals(12, admin.size());
        assertFalse(admin.contains(Permissions.PROJECT_DELETE));
        assertEquals(Set.of("project.view", "pchat.read", "pchat.write"), SystemRole.MEMBER.projectPermissions());
    }

    @Test
    void projectAccessPolicyCoversEveryBranch() {
        Set<String> none = Set.of();
        assertTrue(ProjectPermissionPolicy.effective(none, false, false, none).isEmpty());

        Set<String> memberOnly = ProjectPermissionPolicy.effective(none, false, true, none);
        assertEquals(Set.of(Permissions.PROJECT_VIEW), memberOnly);

        Set<String> viewAll = ProjectPermissionPolicy.effective(Set.of(Permissions.PROJECT_VIEW_ALL), false, false, none);
        assertEquals(Set.of(Permissions.PROJECT_VIEW, Permissions.PCHAT_READ), viewAll);

        Set<String> admin = ProjectPermissionPolicy.effective(Set.of(Permissions.WORKSPACE_EDIT), false, false, none);
        assertEquals(13, admin.size());

        Set<String> owner = ProjectPermissionPolicy.effective(none, true, false, none);
        assertEquals(13, owner.size());

        Set<String> merged = ProjectPermissionPolicy.effective(
            Set.of(Permissions.PROJECT_VIEW_ALL), false, true, Set.of(Permissions.PCHAT_WRITE)
        );
        assertEquals(Set.of("project.view", "pchat.read", "pchat.write"), merged);
    }

    @Test
    void visibilityOfAllProjectsRequiresOwnershipOrViewAllOrEdit() {
        assertFalse(ProjectPermissionPolicy.canSeeAllProjects(Set.of("workspace.view"), false));
        assertTrue(ProjectPermissionPolicy.canSeeAllProjects(Set.of(), true));
        assertTrue(ProjectPermissionPolicy.canSeeAllProjects(Set.of(Permissions.PROJECT_VIEW_ALL), false));
        assertTrue(ProjectPermissionPolicy.canSeeAllProjects(Set.of(Permissions.WORKSPACE_EDIT), false));
    }
}
