package com.orbit.cloud.service;

import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.cloud.repository.CloudNodeRepository;
import com.orbit.common.ApiException;
import java.util.List;
import java.util.UUID;

final class CloudNodeMover {
    private CloudNodeMover() {}

    static void apply(
        CloudScope scope, CloudNodeEntity node, UUID targetId, CloudNodeService service, CloudNodeRepository repo
    ) {
        service.requireWritable(scope, node.getId());
        int depth = 0;
        if (targetId != null) {
            if (targetId.equals(node.getId())) throw cycle();
            service.requireWritable(scope, targetId);
            depth = service.requireActiveFolder(scope, targetId).getDepth() + 1;
        }
        if (node.getNodeType() == CloudNodeType.FOLDER) {
            List<UUID> ids = repo.findSubtreeIds(node.getId(), scope.type().name(), scope.scopeId());
            if (targetId != null && ids.contains(targetId)) throw cycle();
            int delta = depth - node.getDepth();
            List<CloudNodeEntity> subtree = repo.findAllById(ids);
            for (CloudNodeEntity item : subtree) {
                if (item.getDepth() + delta > CloudNodeService.MAX_DEPTH) {
                    throw ApiException.badRequest("MAX_DEPTH_EXCEEDED", "Maximum folder depth of 20 exceeded.");
                }
            }
            for (CloudNodeEntity item : subtree) {
                if (!item.getId().equals(node.getId())) item.setDepth(item.getDepth() + delta);
            }
            repo.saveAll(subtree);
        } else if (depth > CloudNodeService.MAX_DEPTH) {
            throw ApiException.badRequest("MAX_DEPTH_EXCEEDED", "Maximum folder depth of 20 exceeded.");
        }
        node.setParentId(targetId);
        node.setDepth(depth);
    }

    private static ApiException cycle() {
        return ApiException.badRequest("FOLDER_CYCLE", "Cannot move a folder into itself or its descendant.");
    }
}
