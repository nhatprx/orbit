package com.orbit.cloud.service;

import com.orbit.cloud.entity.CloudScopeType;
import com.orbit.cloud.repository.CloudNodeRepository;
import com.orbit.cloud.repository.CloudStorageQuotaRepository;
import com.orbit.cloud.repository.CloudUploadSessionRepository;
import com.orbit.storage.service.CloudStorageClient;
import com.orbit.workspace.event.WorkspacePurgingEvent;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Purges all Workspace and Project Cloud Files metadata, quotas, and S3 objects when a workspace is purged. */
@Component
public class CloudLifecycleListener {

    private final CloudNodeRepository nodeRepo;
    private final CloudUploadSessionRepository sessionRepo;
    private final CloudStorageQuotaRepository quotaRepo;
    private final CloudStorageClient storageClient;

    public CloudLifecycleListener(
        CloudNodeRepository nodeRepo,
        CloudUploadSessionRepository sessionRepo,
        CloudStorageQuotaRepository quotaRepo,
        CloudStorageClient storageClient
    ) {
        this.nodeRepo = nodeRepo;
        this.sessionRepo = sessionRepo;
        this.quotaRepo = quotaRepo;
        this.storageClient = storageClient;
    }

    @EventListener
    @Transactional
    public void onWorkspacePurging(WorkspacePurgingEvent event) {
        List<String> keysToDelete = new ArrayList<>();
        List<UUID> wsIds = List.of(event.workspaceId());
        keysToDelete.addAll(nodeRepo.findStorageKeysByScopes(CloudScopeType.WORKSPACE.name(), wsIds));
        sessionRepo.deleteByScopeTypeAndScopeIdIn(CloudScopeType.WORKSPACE, wsIds);
        nodeRepo.deleteByScopeTypeAndScopeIdIn(CloudScopeType.WORKSPACE, wsIds);
        quotaRepo.deleteByScopeTypeAndScopeIdIn(CloudScopeType.WORKSPACE, wsIds);

        List<UUID> projectIds = event.projectIds();
        if (projectIds != null && !projectIds.isEmpty()) {
            keysToDelete.addAll(nodeRepo.findStorageKeysByScopes(CloudScopeType.PROJECT.name(), projectIds));
            sessionRepo.deleteByScopeTypeAndScopeIdIn(CloudScopeType.PROJECT, projectIds);
            nodeRepo.deleteByScopeTypeAndScopeIdIn(CloudScopeType.PROJECT, projectIds);
            quotaRepo.deleteByScopeTypeAndScopeIdIn(CloudScopeType.PROJECT, projectIds);
        }
        storageClient.deleteObjects(keysToDelete);
    }
}
