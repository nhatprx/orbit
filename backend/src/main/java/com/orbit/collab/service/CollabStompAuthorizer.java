package com.orbit.collab.service;

import com.orbit.cloud.entity.CloudScopeType;
import com.orbit.cloud.repository.CloudNodeRepository;
import com.orbit.project.repository.ProjectRepository;
import com.orbit.whiteboard.repository.WhiteboardRepository;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import java.util.UUID;
import org.springframework.messaging.MessagingException;
import org.springframework.stereotype.Component;

@Component
public class CollabStompAuthorizer {
    private final WhiteboardRepository boards;
    private final CloudNodeRepository nodes;
    private final ProjectRepository projects;
    private final WorkspacePermissionEvaluator permissions;

    public CollabStompAuthorizer(
        WhiteboardRepository boards, CloudNodeRepository nodes, ProjectRepository projects,
        WorkspacePermissionEvaluator permissions
    ) {
        this.boards = boards;
        this.nodes = nodes;
        this.projects = projects;
        this.permissions = permissions;
    }

    public void authorizeSubscribe(UUID userId, String destination) {
        if (destination.startsWith("/topic/collab.workspace.")) {
            requireWorkspaceRead(userId, uuidTail(destination));
            return;
        }
        if (destination.startsWith("/topic/collab.project.")) {
            UUID projectId = uuidTail(destination);
            var project = projects.findById(projectId).orElseThrow(CollabStompAuthorizer::denied);
            if (!permissions.hasProjectPermission(userId, project.getWorkspaceId(), projectId, Permissions.PROJECT_VIEW)) {
                throw denied();
            }
            return;
        }
        if (destination.startsWith("/topic/collab.whiteboard.")) {
            var board = boards.findById(uuidTail(destination)).orElseThrow(CollabStompAuthorizer::denied);
            if (!canReadBoard(userId, board.getWorkspaceId(), board.getProjectId())) throw denied();
            return;
        }
        if (destination.startsWith("/topic/collab.cloud.")) {
            var node = nodes.findById(uuidTail(destination)).orElseThrow(CollabStompAuthorizer::denied);
            if (!canReadCloud(userId, node.getScopeType(), node.getScopeId(), node.getWorkspaceId(), node.getProjectId())) {
                throw denied();
            }
            return;
        }
        throw denied();
    }

    public void authorizeEdit(UUID userId, String destination) {
        String prefix = "/app/collab.";
        if (destination == null || !destination.startsWith(prefix) || !destination.endsWith(".edit")) throw denied();
        String[] parts = destination.substring(prefix.length()).split("\\.");
        if (parts.length != 3) throw denied();
        UUID id = parseUuid(parts[1]);
        if ("whiteboard".equals(parts[0])) {
            var board = boards.findById(id).orElseThrow(CollabStompAuthorizer::denied);
            if (board.isLocked() || !canWriteBoard(userId, board.getWorkspaceId(), board.getProjectId())) throw denied();
        } else if ("cloud".equals(parts[0])) {
            var node = nodes.findById(id).orElseThrow(CollabStompAuthorizer::denied);
            if ((nodes.hasLockedAncestor(id, node.getScopeType().name(), node.getScopeId())
                || nodes.hasLockedSubtree(id, node.getScopeType().name(), node.getScopeId()))
                || !canWriteCloud(userId, node.getScopeType(), node.getScopeId(), node.getWorkspaceId(), node.getProjectId())) {
                throw denied();
            }
        } else {
            throw denied();
        }
    }

    public void authorizePresence(UUID userId, String destination) {
        String prefix = "/app/collab.";
        if (destination == null || !destination.startsWith(prefix) || !destination.endsWith(".presence")) throw denied();
        authorizeSubscribe(userId, destination.replace("/app/collab.", "/topic/collab.").replace(".presence", ""));
    }

    private boolean canReadBoard(UUID user, UUID workspace, UUID project) {
        return project == null
            ? permissions.hasWorkspacePermission(user, workspace, Permissions.WHITEBOARD_READ)
            : permissions.hasProjectPermission(user, workspace, project, Permissions.PWHITEBOARD_READ);
    }

    private boolean canWriteBoard(UUID user, UUID workspace, UUID project) {
        return project == null
            ? permissions.hasWorkspacePermission(user, workspace, Permissions.WHITEBOARD_WRITE)
            : permissions.hasProjectPermission(user, workspace, project, Permissions.PWHITEBOARD_WRITE);
    }

    private boolean canReadCloud(UUID user, CloudScopeType type, UUID scope, UUID workspace, UUID project) {
        return switch (type) {
            case USER -> user.equals(scope);
            case WORKSPACE -> permissions.hasWorkspacePermission(user, workspace, Permissions.FILES_READ);
            case PROJECT -> permissions.hasProjectPermission(user, workspace, project, Permissions.PFILES_READ);
        };
    }

    private boolean canWriteCloud(UUID user, CloudScopeType type, UUID scope, UUID workspace, UUID project) {
        return switch (type) {
            case USER -> user.equals(scope);
            case WORKSPACE -> permissions.hasWorkspacePermission(user, workspace, Permissions.FILES_WRITE);
            case PROJECT -> permissions.hasProjectPermission(user, workspace, project, Permissions.PFILES_WRITE);
        };
    }

    private void requireWorkspaceRead(UUID user, UUID workspace) {
        if (!permissions.resolveWorkspace(user, workspace).active()) throw denied();
    }

    private static UUID uuidTail(String destination) {
        String[] parts = destination.split("\\.");
        return parseUuid(parts[parts.length - 1]);
    }

    private static UUID parseUuid(String value) {
        try { return UUID.fromString(value); } catch (IllegalArgumentException ex) { throw denied(); }
    }

    private static MessagingException denied() {
        return new MessagingException("Collaboration destination is not allowed.");
    }
}
