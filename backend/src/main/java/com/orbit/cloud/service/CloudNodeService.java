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
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CloudNodeService {

    public static final int MAX_DEPTH = 20;

    private final CloudNodeRepository nodeRepo;
    private final CloudNodeQueryRepository queryRepo;
    private final CloudNodeMapper mapper;

    public CloudNodeService(
        CloudNodeRepository nodeRepo,
        CloudNodeQueryRepository queryRepo,
        CloudNodeMapper mapper
    ) {
        this.nodeRepo = nodeRepo;
        this.queryRepo = queryRepo;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public CursorPageResponse<CloudNodeResponse> listNodes(
        CloudScope scope, UUID parentId, String view, String q, String sortBy, String sortDir, String cursor, int limit
    ) {
        int clamped = PageParams.clampSize(limit);
        String effectiveSort = normalizeSortBy(sortBy);
        boolean ascending = !"desc".equalsIgnoreCase(sortDir);
        CloudCursor decoded = (cursor == null || cursor.isBlank()) ? null : CloudCursor.decode(cursor);

        List<CloudNodeEntity> rows = queryRepo.findPage(
            scope, parentId, view, q, effectiveSort, ascending, decoded, clamped + 1
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
        List<CloudBreadcrumbItem> items = rows.stream()
            .map(row -> new CloudBreadcrumbItem((UUID) row[0], (String) row[1]))
            .toList();
        return new CloudBreadcrumbsResponse(items);
    }

    @Transactional
    public CloudNodeResponse createFolder(CloudScope scope, UUID actorId, CreateFolderRequest request) {
        String name = CloudNameValidator.validateAndTrim(request.name());
        int depth = 0;
        if (request.parentId() != null) {
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
        return mapper.toResponse(saveCheckingDuplicate(folder));
    }

    @Transactional
    public CloudNodeResponse updateNode(CloudScope scope, UUID actorId, UUID nodeId, UpdateCloudNodeRequest req) {
        CloudNodeEntity node = requireActiveNode(scope, nodeId);
        if (req.name() != null) {
            String valid = CloudNameValidator.validateAndTrim(req.name());
            node.setName(valid);
            node.setNameNormalized(CloudNameValidator.normalize(valid));
        }
        if (req.starred() != null) {
            node.setStarred(req.starred());
        }
        boolean wantsMove = Boolean.TRUE.equals(req.moveToRoot()) || req.parentId() != null;
        if (wantsMove) {
            UUID targetParentId = Boolean.TRUE.equals(req.moveToRoot()) ? null : req.parentId();
            applyMove(scope, node, targetParentId);
        }
        node.setUpdatedBy(actorId);
        return mapper.toResponse(saveCheckingDuplicate(node));
    }

    private void applyMove(CloudScope scope, CloudNodeEntity node, UUID targetParentId) {
        int newDepth = 0;
        if (targetParentId != null) {
            if (targetParentId.equals(node.getId())) {
                throw ApiException.badRequest("FOLDER_CYCLE", "Cannot move a folder into itself.");
            }
            CloudNodeEntity targetParent = requireActiveFolder(scope, targetParentId);
            newDepth = targetParent.getDepth() + 1;
        }
        if (node.getNodeType() == CloudNodeType.FOLDER) {
            List<UUID> subtreeIds = nodeRepo.findSubtreeIds(node.getId(), scope.type().name(), scope.scopeId());
            if (targetParentId != null && subtreeIds.contains(targetParentId)) {
                throw ApiException.badRequest("FOLDER_CYCLE", "Cannot move a folder into its own descendant.");
            }
            int delta = newDepth - node.getDepth();
            List<CloudNodeEntity> subtree = nodeRepo.findAllById(subtreeIds);
            for (CloudNodeEntity item : subtree) {
                if (item.getDepth() + delta > MAX_DEPTH) {
                    throw ApiException.badRequest("MAX_DEPTH_EXCEEDED", "Maximum folder depth of 20 exceeded.");
                }
            }
            for (CloudNodeEntity item : subtree) {
                if (!item.getId().equals(node.getId())) {
                    item.setDepth(item.getDepth() + delta);
                }
            }
            nodeRepo.saveAll(subtree);
        } else if (newDepth > MAX_DEPTH) {
            throw ApiException.badRequest("MAX_DEPTH_EXCEEDED", "Maximum folder depth of 20 exceeded.");
        }
        node.setParentId(targetParentId);
        node.setDepth(newDepth);
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
