package com.orbit.cloud.service;
import com.orbit.cloud.dto.CloudBreadcrumbItem;
import com.orbit.cloud.dto.CloudBreadcrumbsResponse;
import com.orbit.cloud.dto.CloudNodeResponse;
import com.orbit.cloud.dto.CreateFolderRequest;
import com.orbit.cloud.dto.UpdateCloudNodeRequest;
import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.cloud.entity.CloudUploadStatus;
import com.orbit.cloud.repository.CloudNodeQueryRepository;
import com.orbit.cloud.repository.CloudNodeRepository;
import com.orbit.common.ApiException;
import com.orbit.common.CursorPageResponse;
import com.orbit.common.PageParams;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class CloudNodeService {
    public static final int MAX_DEPTH = 20;
    private final CloudNodeRepository nodeRepo;
    private final CloudNodeQueryRepository queryRepo;
    private final CloudNodeMapper mapper;
    private CloudNodeCollabEvents collabEvents;
    public CloudNodeService(
        CloudNodeRepository nodeRepo,
        CloudNodeQueryRepository queryRepo,
        CloudNodeMapper mapper
    ) {
        this.nodeRepo = nodeRepo;
        this.queryRepo = queryRepo;
        this.mapper = mapper;
    }

    @Autowired(required = false)
    void setCollabEvents(CloudNodeCollabEvents events) { this.collabEvents = events; }
    @Transactional(readOnly = true)
    public CursorPageResponse<CloudNodeResponse> listNodes(
        CloudScope scope, UUID parentId, String view, String q, String sortBy, String sortDir, String cursor, int limit
    ) {
        int clamped = PageParams.clampSize(limit);
        String normalizedView = view == null ? "ALL" : view.trim().toUpperCase(Locale.ROOT);
        boolean isRecents = "RECENTS".equals(normalizedView);
        String effectiveSort = (sortBy == null || sortBy.isBlank())
            ? (isRecents ? "updatedAt" : "name")
            : normalizeSortBy(sortBy);
        boolean ascending = (sortDir == null || sortDir.isBlank())
            ? !isRecents
            : !"desc".equalsIgnoreCase(sortDir);
        CloudCursor decoded = (cursor == null || cursor.isBlank()) ? null : CloudCursor.decode(cursor);
        List<CloudNodeEntity> rows = queryRepo.findPage(
            scope, parentId, normalizedView, q, effectiveSort, ascending, decoded, clamped + 1
        );
        boolean hasMore = rows.size() > clamped;
        List<CloudNodeEntity> page = hasMore ? rows.subList(0, clamped) : rows;
        String nextCursor = hasMore ? CloudCursor.encode(page.getLast(), effectiveSort) : null;
        return new CursorPageResponse<>(mapper.toResponses(page), nextCursor, hasMore, clamped);
    }
    @Transactional(readOnly = true)
    public CloudBreadcrumbsResponse getBreadcrumbs(CloudScope scope, UUID nodeId) {
        List<Object[]> rows = nodeRepo.findBreadcrumbRows(nodeId, scope.type().name(), scope.scopeId());
        if (rows.isEmpty()) {
            throw ApiException.notFound("NODE_NOT_FOUND", "Node not found.");
        }
        boolean inheritedLock = false;
        List<CloudBreadcrumbItem> items = new java.util.ArrayList<>(rows.size());
        for (Object[] row : rows) {
            boolean locked = Boolean.TRUE.equals(row[2]);
            inheritedLock |= locked;
            items.add(new CloudBreadcrumbItem((UUID) row[0], (String) row[1], locked, inheritedLock));
        }
        return new CloudBreadcrumbsResponse(items);
    }
    @Transactional
    public CloudNodeResponse createFolder(CloudScope scope, UUID actorId, CreateFolderRequest request) {
        String name = CloudNameValidator.validateAndTrim(request.name());
        int depth = 0;
        if (request.parentId() != null) {
            requireWritable(scope, request.parentId());
            CloudNodeEntity parent = requireActiveFolder(scope, request.parentId());
            depth = parent.getDepth() + 1;
            if (depth > MAX_DEPTH) {
                throw ApiException.badRequest("MAX_DEPTH_EXCEEDED", "Maximum folder depth of 20 exceeded.");
            }
        }
        CloudNodeEntity folder = new CloudNodeEntity();
        folder.setScopeType(scope.type());
        folder.setScopeId(scope.scopeId());
        folder.setWorkspaceId(scope.workspaceId());
        folder.setProjectId(scope.projectId());
        folder.setParentId(request.parentId());
        folder.setNodeType(CloudNodeType.FOLDER);
        folder.setName(name);
        folder.setNameNormalized(CloudNameValidator.normalize(name));
        folder.setUploadStatus(CloudUploadStatus.READY);
        folder.setDepth(depth);
        folder.setCreatedBy(actorId);
        folder.setUpdatedBy(actorId);
        CloudNodeEntity saved = saveCheckingDuplicate(folder);
        publishCatalog(scope, "CREATE", saved.getId(), null);
        return mapper.toResponse(saved);
    }
    @Transactional
    public CloudNodeResponse updateNode(CloudScope scope, UUID actorId, UUID nodeId, UpdateCloudNodeRequest req) {
        CloudNodeEntity node = requireActiveNode(scope, nodeId);
        requireWritable(scope, nodeId);
        if (req.name() != null) {
            String valid = CloudNameValidator.validateRename(node.getName(), node.getNodeType(), req.name());
            node.setName(valid);
            node.setNameNormalized(CloudNameValidator.normalize(valid));
        }
        if (req.starred() != null) {
            node.setStarred(req.starred());
        }
        boolean wantsMove = Boolean.TRUE.equals(req.moveToRoot()) || req.parentId() != null;
        if (wantsMove) {
            UUID targetParentId = Boolean.TRUE.equals(req.moveToRoot()) ? null : req.parentId();
            CloudNodeMover.apply(scope, node, targetParentId, this, nodeRepo);
        }
        node.setUpdatedBy(actorId);
        CloudNodeEntity saved = saveCheckingDuplicate(node);
        publishCatalog(scope, "UPDATE", saved.getId(), null);
        return mapper.toResponse(saved);
    }

    public CloudNodeEntity requireActiveFolder(CloudScope scope, UUID folderId) {
        CloudNodeEntity folder = requireActiveNode(scope, folderId);
        if (folder.getNodeType() != CloudNodeType.FOLDER) {
            throw ApiException.badRequest("NOT_A_FOLDER", "Target parent must be a folder.");
        }
        return folder;
    }

    public CloudNodeEntity requireActiveNode(CloudScope scope, UUID nodeId) {
        CloudNodeEntity node = nodeRepo.findByIdAndScopeTypeAndScopeId(nodeId, scope.type(), scope.scopeId())
            .orElseThrow(() -> ApiException.notFound("NODE_NOT_FOUND", "Node not found."));
        if (node.getDeletedAt() != null || node.getUploadStatus() != CloudUploadStatus.READY) {
            throw ApiException.notFound("NODE_NOT_FOUND", "Node not found.");
        }
        return node;
    }

    public void requireWritable(CloudScope scope, UUID nodeId) {
        if (nodeRepo.hasLockedAncestor(nodeId, scope.type().name(), scope.scopeId())
            || nodeRepo.hasLockedSubtree(nodeId, scope.type().name(), scope.scopeId())) {
            throw ApiException.locked("RESOURCE_LOCKED", "This file or folder is locked.");
        }
    }

    @Transactional
    public CloudNodeResponse setLocked(CloudScope scope, UUID nodeId, UUID actorId, boolean locked) {
        CloudNodeEntity node = requireActiveNode(scope, nodeId);
        node.setLocked(locked);
        node.setLockedBy(locked ? actorId : null);
        node.setLockedAt(locked ? java.time.Instant.now() : null);
        CloudNodeEntity saved = nodeRepo.save(node);
        if (collabEvents != null) collabEvents.lockChanged(scope, saved, actorId, locked);
        return mapper.toResponse(saved);
    }

    public void publishCatalog(CloudScope scope, String action, UUID resourceId, Boolean locked) {
        if (collabEvents != null) collabEvents.catalogChanged(scope, action, resourceId, locked);
    }

    public void broadcastCheckpoint(CloudScope scope, UUID nodeId, UUID actorId, java.time.Instant updatedAt) {
        if (collabEvents != null) collabEvents.checkpoint(scope, nodeId, actorId, updatedAt);
    }

    private CloudNodeEntity saveCheckingDuplicate(CloudNodeEntity node) {
        try {
            return nodeRepo.saveAndFlush(node);
        } catch (DataIntegrityViolationException ex) {
            throw ApiException.conflict("DUPLICATE_NAME", "An item with that name already exists in this folder.");
        }
    }

    private static String normalizeSortBy(String sortBy) {
        if ("size".equalsIgnoreCase(sortBy)) return "size";
        if ("updatedAt".equalsIgnoreCase(sortBy)) return "updatedAt";
        return "name";
    }
}
