package com.orbit.workspace.service;

import com.orbit.common.ApiException;
import com.orbit.common.InputRules;
import com.orbit.common.PageParams;
import com.orbit.common.PageResponse;
import com.orbit.common.SlugGenerator;
import com.orbit.common.Timestamps;
import com.orbit.workspace.dto.CreateWorkspaceRequest;
import com.orbit.workspace.dto.UpdateWorkspaceRequest;
import com.orbit.workspace.dto.WorkspaceDto;
import com.orbit.workspace.entity.WorkspaceEntity;
import com.orbit.workspace.entity.WorkspaceMemberEntity;
import com.orbit.workspace.event.WorkspaceCreatedEvent;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.repository.WorkspaceMemberRepository;
import com.orbit.workspace.repository.WorkspaceRepository;
import com.orbit.workspace.service.SystemRoleSeeder.SeededRoles;
import java.util.List;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkspaceService {

    private final WorkspaceRepository workspaces;
    private final WorkspaceMemberRepository members;
    private final SystemRoleSeeder seeder;
    private final WorkspaceModuleService moduleService;
    private final ModuleCatalog catalog;
    private final WorkspaceAssembler assembler;
    private final WorkspacePermissionEvaluator evaluator;
    private final ApplicationEventPublisher events;

    public WorkspaceService(
        WorkspaceRepository workspaces,
        WorkspaceMemberRepository members,
        SystemRoleSeeder seeder,
        WorkspaceModuleService moduleService,
        ModuleCatalog catalog,
        WorkspaceAssembler assembler,
        WorkspacePermissionEvaluator evaluator,
        ApplicationEventPublisher events
    ) {
        this.workspaces = workspaces;
        this.members = members;
        this.seeder = seeder;
        this.moduleService = moduleService;
        this.catalog = catalog;
        this.assembler = assembler;
        this.evaluator = evaluator;
        this.events = events;
    }

    /** Wizard submit: the only point where a Workspace is persisted (no partial state, WS-01). */
    @Transactional
    public WorkspaceDto create(UUID userId, CreateWorkspaceRequest request) {
        List<String> moduleKeys = catalog.validKeysAllowEmpty(request.moduleKeys());

        WorkspaceEntity workspace = new WorkspaceEntity();
        workspace.setName(request.name().trim());
        workspace.setSlug(SlugGenerator.unique(workspace.getName(), "workspace", workspaces::existsBySlugIgnoreCase));
        workspace.setDescription(InputRules.blankToNull(request.description()));
        workspace.setAvatarUrl(InputRules.avatarUrl(request.avatarUrl()));
        workspace.setOwnerId(userId);
        workspaces.save(workspace);

        SeededRoles roles = seeder.seedWorkspaceRoles(workspace.getId());
        members.save(new WorkspaceMemberEntity(workspace.getId(), userId, roles.ownerRoleId()));
        moduleService.initialize(workspace.getId(), moduleKeys);

        events.publishEvent(new WorkspaceCreatedEvent(
            workspace.getId(),
            userId,
            InputRules.normalizeEmails(request.inviteEmails()),
            moduleKeys.contains("chat")
        ));
        return assembler.assembleOne(userId, workspace);
    }

    @Transactional(readOnly = true)
    public PageResponse<WorkspaceDto> list(UUID userId, boolean includeDeleted, int page, int size) {
        Pageable pageable = PageParams.of(page, size, Sort.by("createdAt").ascending());
        Page<WorkspaceEntity> result = includeDeleted
            ? workspaces.findActiveAndRestorableForUser(userId, Timestamps.now(), pageable)
            : workspaces.findActiveForUser(userId, pageable);
        return PageResponse.from(result, assembler.assemble(userId, result.getContent()));
    }

    @Transactional(readOnly = true)
    public WorkspaceDto get(UUID userId, UUID workspaceId) {
        evaluator.requireWorkspacePermission(userId, workspaceId, Permissions.WORKSPACE_VIEW);
        return assembler.assembleOne(userId, loadActive(workspaceId));
    }

    @Transactional
    public WorkspaceDto update(UUID userId, UUID workspaceId, UpdateWorkspaceRequest request) {
        evaluator.requireWorkspacePermission(userId, workspaceId, Permissions.WORKSPACE_EDIT);
        WorkspaceEntity workspace = loadActive(workspaceId);

        if (request.name() != null) {
            String name = request.name().trim();
            if (name.isEmpty()) {
                throw ApiException.badRequest("VALIDATION_ERROR", "Workspace name must not be blank.");
            }
            workspace.setName(name);
        }
        if (request.description() != null) {
            workspace.setDescription(InputRules.blankToNull(request.description()));
        }
        if (request.avatarUrl() != null) {
            workspace.setAvatarUrl(InputRules.avatarUrl(request.avatarUrl()));
        }
        return assembler.assembleOne(userId, workspaces.save(workspace));
    }

    private WorkspaceEntity loadActive(UUID workspaceId) {
        return workspaces.findByIdAndDeletedAtIsNull(workspaceId)
            .orElseThrow(() -> ApiException.notFound("WORKSPACE_NOT_FOUND", "Workspace not found."));
    }
}
