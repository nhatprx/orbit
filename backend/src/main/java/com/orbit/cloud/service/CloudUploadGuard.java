package com.orbit.cloud.service;

import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudUploadSessionEntity;
import com.orbit.cloud.repository.CloudNodeRepository;
import com.orbit.common.ApiException;
import java.util.Objects;
import org.springframework.stereotype.Component;

@Component
public class CloudUploadGuard {
    private final CloudNodeRepository nodeRepository;
    private final CloudNodeService nodeService;

    public CloudUploadGuard(CloudNodeRepository nodeRepository, CloudNodeService nodeService) {
        this.nodeRepository = nodeRepository;
        this.nodeService = nodeService;
    }

    public int resolveParentDepth(CloudScope scope, java.util.UUID parentId) {
        if (parentId == null) return 0;
        int depth = nodeService.requireActiveFolder(scope, parentId).getDepth() + 1;
        if (depth > CloudNodeService.MAX_DEPTH) {
            throw ApiException.badRequest("MAX_DEPTH_EXCEEDED", "Maximum folder depth of 20 exceeded.");
        }
        return depth;
    }

    public void requireSessionWritable(CloudScope scope, CloudUploadSessionEntity session) {
        nodeRepository.findByIdAndScopeTypeAndScopeId(session.getNodeId(), scope.type(), scope.scopeId())
            .map(CloudNodeEntity::getParentId).filter(Objects::nonNull)
            .ifPresent(parentId -> nodeService.requireWritable(scope, parentId));
    }
}
