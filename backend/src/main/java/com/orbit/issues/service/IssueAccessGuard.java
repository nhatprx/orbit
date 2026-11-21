package com.orbit.issues.service;

import com.orbit.common.ApiException;
import com.orbit.project.entity.ProjectEntity;
import com.orbit.project.repository.ProjectMemberRepository;
import com.orbit.project.repository.ProjectModuleRepository;
import com.orbit.project.repository.ProjectRepository;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.ProjectPermissionPolicy;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator.ProjectAccess;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator.WorkspaceAccess;
import com.orbit.workspace.repository.KeyValue;
import com.orbit.workspace.repository.WorkspaceMemberRepository;
import com.orbit.workspace.service.WorkspaceModuleService;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/** Enforces RBAC permission keys, membership boundaries, and module enablement for Issues & Sprints. */
@Component
public class IssueAccessGuard {

    public static final String ISSUES_MODULE = "issues";

    private final ProjectRepository projects;
    private final ProjectModuleRepository projectModules;
    private final ProjectMemberRepository projectMembers;
    private final WorkspaceMemberRepository workspaceMembers;
    private final WorkspaceModuleService workspaceModules;
    private final WorkspacePermissionEvaluator evaluator;

    public IssueAccessGuard(
        ProjectRepository projects,
        ProjectModuleRepository projectModules,
        ProjectMemberRepository projectMembers,
        WorkspaceMemberRepository workspaceMembers,
        WorkspaceModuleService workspaceModules,
        WorkspacePermissionEvaluator evaluator
    ) {
        this.projects = projects;
        this.projectModules = projectModules;
        this.projectMembers = projectMembers;
        this.workspaceMembers = workspaceMembers;
        this.workspaceModules = workspaceModules;
        this.evaluator = evaluator;
    }

    public ProjectEntity requireProjectPermission(
        UUID userId, UUID workspaceId, UUID projectId, String... anyOfPermissions
    ) {
        ProjectAccess access = requireProjectAccessWithModule(userId, workspaceId, projectId);
        boolean allowed = false;
        for (String key : anyOfPermissions) {
            if (access.permissions().contains(key)) {
                allowed = true;
                break;
            }
        }
        if (!allowed) {
            throw ApiException.forbidden("FORBIDDEN", "You do not have permission to perform this action.");
        }
        return loadProject(workspaceId, projectId);
    }

    public ProjectAccess requireProjectAccessWithModule(UUID userId, UUID workspaceId, UUID projectId) {
        ProjectAccess access = evaluator.requireProjectAccess(userId, workspaceId, projectId);
        boolean enabled = projectModules.findEffectiveEnabled(List.of(projectId)).stream()
            .map(KeyValue::value)
            .anyMatch(ISSUES_MODULE::equals);
        if (!enabled) {
            throw moduleDisabled();
        }
        return access;
    }

    public WorkspaceAccess requireWorkspaceIssuesAccess(UUID userId, UUID workspaceId) {
        WorkspaceAccess access = evaluator.requireWorkspaceAccess(userId, workspaceId);
        if (!access.permissions().contains(Permissions.ISSUES_READ)) {
            throw ApiException.forbidden("FORBIDDEN", "You do not have permission to view workspace issues.");
        }
        if (!workspaceModules.enabledKeys(workspaceId).contains(ISSUES_MODULE)) {
            throw moduleDisabled();
        }
        return access;
    }

    public void requireValidAssignee(UUID workspaceId, UUID projectId, UUID assigneeId) {
        if (assigneeId == null) {
            return;
        }
        boolean isMember = projectMembers.existsByIdProjectIdAndIdUserId(projectId, assigneeId)
            || workspaceMembers.existsByIdWorkspaceIdAndIdUserId(workspaceId, assigneeId);
        if (!isMember) {
            throw ApiException.badRequest("INVALID_ASSIGNEE", "Assignee must be a member of this workspace or project.");
        }
    }

    public List<ProjectEntity> filterReadableIssueProjects(
        UUID userId, WorkspaceAccess access, List<ProjectEntity> candidates
    ) {
        if (candidates.isEmpty()) {
            return List.of();
        }
        List<UUID> candidateIds = candidates.stream().map(ProjectEntity::getId).toList();
        Set<UUID> enabledProjectIds = projectModules.findEffectiveEnabled(candidateIds).stream()
            .filter(kv -> ISSUES_MODULE.equals(kv.value()))
            .map(KeyValue::key)
            .collect(Collectors.toSet());
        List<ProjectEntity> withModule = candidates.stream()
            .filter(p -> enabledProjectIds.contains(p.getId()))
            .toList();
        if (withModule.isEmpty()) {
            return List.of();
        }
        Set<String> inherited = ProjectPermissionPolicy.effective(access.permissions(), access.owner(), false, Set.of());
        if (inherited.contains(Permissions.PISSUES_READ)) {
            return withModule;
        }
        List<UUID> enabledIds = withModule.stream().map(ProjectEntity::getId).toList();
        Map<UUID, Set<String>> explicitByProject = KeyValue.groupSet(projectMembers.findPermissionKeys(userId, enabledIds));
        return withModule.stream()
            .filter(p -> ProjectPermissionPolicy.effective(
                access.permissions(), access.owner(), true, explicitByProject.getOrDefault(p.getId(), Set.of())
            ).contains(Permissions.PISSUES_READ))
            .toList();
    }

    public ProjectEntity loadProject(UUID workspaceId, UUID projectId) {
        return projects.findByIdAndWorkspaceIdAndDeletedAtIsNull(projectId, workspaceId)
            .orElseThrow(() -> ApiException.notFound("NOT_FOUND", "Project not found."));
    }

    private static ApiException moduleDisabled() {
        return ApiException.forbidden("MODULE_DISABLED", "The issues module is disabled here.");
    }
}
