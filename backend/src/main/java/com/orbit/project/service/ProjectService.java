package com.orbit.project.service;

import com.orbit.common.ApiException;
import com.orbit.common.InputRules;
import com.orbit.common.PageParams;
import com.orbit.common.PageResponse;
import com.orbit.common.SlugGenerator;
import com.orbit.common.Timestamps;
import com.orbit.project.dto.CreateProjectRequest;
import com.orbit.project.dto.ProjectDto;
import com.orbit.project.dto.UpdateProjectRequest;
import com.orbit.project.entity.ProjectEntity;
import com.orbit.project.entity.ProjectMemberEntity;
import com.orbit.project.entity.ProjectModuleEntity;
import com.orbit.project.event.ProjectCreatedEvent;
import com.orbit.project.repository.ProjectMemberRepository;
import com.orbit.project.repository.ProjectModuleRepository;
import com.orbit.project.repository.ProjectRepository;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.ProjectPermissionPolicy;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator.WorkspaceAccess;
import com.orbit.workspace.service.ModuleCatalog;
import com.orbit.workspace.service.SystemRoleSeeder;
import com.orbit.workspace.service.SystemRoleSeeder.SeededRoles;
import com.orbit.workspace.service.WorkspaceModuleService;
import java.util.Set;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectService {

    private final ProjectRepository projects;
    private final ProjectMemberRepository projectMembers;
    private final ProjectModuleRepository projectModules;
    private final SystemRoleSeeder seeder;
    private final WorkspaceModuleService workspaceModules;
    private final ModuleCatalog catalog;
    private final ProjectAssembler assembler;
    private final WorkspacePermissionEvaluator evaluator;
    private final ApplicationEventPublisher events;

    public ProjectService(
        ProjectRepository projects,
        ProjectMemberRepository projectMembers,
        ProjectModuleRepository projectModules,
        SystemRoleSeeder seeder,
        WorkspaceModuleService workspaceModules,
        ModuleCatalog catalog,
        ProjectAssembler assembler,
        WorkspacePermissionEvaluator evaluator,
        ApplicationEventPublisher events
    ) {
        this.projects = projects;
        this.projectMembers = projectMembers;
        this.projectModules = projectModules;
        this.seeder = seeder;
        this.workspaceModules = workspaceModules;
        this.catalog = catalog;
        this.assembler = assembler;
        this.evaluator = evaluator;
        this.events = events;
    }

    /** New projects copy every module currently enabled on the Workspace (O-11). */
    @Transactional
    public ProjectDto create(UUID userId, UUID workspaceId, CreateProjectRequest request) {
        evaluator.requireWorkspacePermission(userId, workspaceId, Permissions.PROJECT_CREATE);

        ProjectEntity project = new ProjectEntity();
        project.setWorkspaceId(workspaceId);
        project.setName(request.name().trim());
        project.setSlug(SlugGenerator.unique(
            project.getName(), "project", slug -> projects.existsByWorkspaceIdAndSlugIgnoreCase(workspaceId, slug)
        ));
        project.setDescription(InputRules.blankToNull(request.description()));
        projects.save(project);

        SeededRoles roles = seeder.seedProjectRoles(project.getId());
        projectMembers.save(new ProjectMemberEntity(project.getId(), userId, roles.ownerRoleId()));

        Set<String> enabled = workspaceModules.enabledKeys(workspaceId);
        projectModules.saveAll(catalog.all().stream()
            .map(m -> new ProjectModuleEntity(project.getId(), m.getModuleKey(), enabled.contains(m.getModuleKey())))
            .toList());

        events.publishEvent(new ProjectCreatedEvent(project.getId(), workspaceId, userId, enabled.contains("chat")));
        return assembler.assembleOne(userId, project);
    }

    @Transactional(readOnly = true)
    public PageResponse<ProjectDto> list(UUID userId, UUID workspaceId, int page, int size) {
        WorkspaceAccess access =
            evaluator.requireWorkspacePermission(userId, workspaceId, Permissions.WORKSPACE_VIEW);
        Pageable pageable = PageParams.of(page, size, Sort.by("createdAt").ascending());
        Page<ProjectEntity> result = ProjectPermissionPolicy.canSeeAllProjects(access.permissions(), access.owner())
            ? projects.findByWorkspaceIdAndDeletedAtIsNull(workspaceId, pageable)
            : projects.findMemberProjects(workspaceId, userId, pageable);
        return PageResponse.from(result, assembler.assemble(userId, result.getContent()));
    }

    @Transactional(readOnly = true)
    public PageResponse<ProjectDto> listMine(UUID userId, int page, int size) {
        Page<ProjectEntity> result = projects.findVisibleAcrossWorkspaces(userId, PageParams.of(page, size));
        return PageResponse.from(result, assembler.assemble(userId, result.getContent()));
    }

    @Transactional(readOnly = true)
    public ProjectDto get(UUID userId, UUID workspaceId, UUID projectId) {
        evaluator.requireProjectAccess(userId, workspaceId, projectId);
        return assembler.assembleOne(userId, load(workspaceId, projectId));
    }

    @Transactional
    public ProjectDto update(UUID userId, UUID workspaceId, UUID projectId, UpdateProjectRequest request) {
        evaluator.requireProjectPermission(userId, workspaceId, projectId, Permissions.PROJECT_EDIT);
        ProjectEntity project = load(workspaceId, projectId);
        if (request.name() != null) {
            String name = request.name().trim();
            if (name.isEmpty()) {
                throw ApiException.badRequest("VALIDATION_ERROR", "Project name must not be blank.");
            }
            project.setName(name);
        }
        if (request.description() != null) {
            project.setDescription(InputRules.blankToNull(request.description()));
        }
        return assembler.assembleOne(userId, projects.save(project));
    }

    @Transactional
    public void delete(UUID userId, UUID workspaceId, UUID projectId) {
        evaluator.requireProjectPermission(userId, workspaceId, projectId, Permissions.PROJECT_DELETE);
        ProjectEntity project = load(workspaceId, projectId);
        project.setDeletedAt(Timestamps.now());
        projects.save(project);
    }

    private ProjectEntity load(UUID workspaceId, UUID projectId) {
        return projects.findByIdAndWorkspaceIdAndDeletedAtIsNull(projectId, workspaceId)
            .orElseThrow(() -> ApiException.notFound("NOT_FOUND", "Project not found."));
    }
}
