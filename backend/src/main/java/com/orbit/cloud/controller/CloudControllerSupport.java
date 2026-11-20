package com.orbit.cloud.controller;

import com.orbit.cloud.dto.CloudBreadcrumbsResponse;
import com.orbit.cloud.dto.CloudDownloadResponse;
import com.orbit.cloud.dto.CloudNodeResponse;
import com.orbit.cloud.dto.CloudQuotaResponse;
import com.orbit.cloud.dto.CompleteUploadRequest;
import com.orbit.cloud.dto.CreateFolderRequest;
import com.orbit.cloud.dto.EmptyTrashResponse;
import com.orbit.cloud.dto.InitUploadRequest;
import com.orbit.cloud.dto.InitUploadResponse;
import com.orbit.cloud.dto.SignPartsRequest;
import com.orbit.cloud.dto.SignPartsResponse;
import com.orbit.cloud.dto.UpdateCloudNodeRequest;
import com.orbit.cloud.service.CloudDownloadService;
import com.orbit.cloud.service.CloudNodeService;
import com.orbit.cloud.service.CloudQuotaService;
import com.orbit.cloud.service.CloudScope;
import com.orbit.cloud.service.CloudTrashService;
import com.orbit.cloud.service.CloudUploadService;
import com.orbit.common.CursorPageResponse;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Shared facade keeping the 3 scope-specific Cloud Files REST controllers thin and uniform. */
@Component
public class CloudControllerSupport {

    private final CloudNodeService nodes;
    private final CloudTrashService trash;
    private final CloudUploadService uploads;
    private final CloudDownloadService downloads;
    private final CloudQuotaService quotas;

    public CloudControllerSupport(
        CloudNodeService nodes,
        CloudTrashService trash,
        CloudUploadService uploads,
        CloudDownloadService downloads,
        CloudQuotaService quotas
    ) {
        this.nodes = nodes;
        this.trash = trash;
        this.uploads = uploads;
        this.downloads = downloads;
        this.quotas = quotas;
    }

    public CursorPageResponse<CloudNodeResponse> listNodes(
        CloudScope scope, UUID parentId, String view, String q, String sortBy, String sortDir, String cursor, int limit
    ) {
        return nodes.listNodes(scope, parentId, view, q, sortBy, sortDir, cursor, limit);
    }

    public CloudBreadcrumbsResponse breadcrumbs(CloudScope scope, UUID nodeId) {
        return nodes.getBreadcrumbs(scope, nodeId);
    }

    public CloudQuotaResponse quota(CloudScope scope) {
        return quotas.getQuota(scope);
    }

    public CloudNodeResponse createFolder(CloudScope scope, UUID actorId, CreateFolderRequest req) {
        return nodes.createFolder(scope, actorId, req);
    }

    public CloudNodeResponse updateNode(CloudScope scope, UUID actorId, UUID nodeId, UpdateCloudNodeRequest req) {
        return nodes.updateNode(scope, actorId, nodeId, req);
    }

    public CloudNodeResponse softDelete(CloudScope scope, UUID actorId, UUID nodeId) {
        return trash.softDelete(scope, actorId, nodeId);
    }

    public CloudNodeResponse restore(CloudScope scope, UUID actorId, UUID nodeId) {
        return trash.restore(scope, actorId, nodeId);
    }

    public void permanentDelete(CloudScope scope, UUID nodeId) {
        trash.permanentDelete(scope, nodeId);
    }

    public EmptyTrashResponse emptyTrash(CloudScope scope) {
        return trash.emptyTrash(scope);
    }

    public InitUploadResponse initUpload(CloudScope scope, UUID actorId, InitUploadRequest req) {
        return uploads.initUpload(scope, actorId, req);
    }

    public SignPartsResponse signParts(CloudScope scope, UUID actorId, UUID sessionId, SignPartsRequest req) {
        return uploads.signParts(scope, actorId, sessionId, req);
    }

    public CloudNodeResponse completeUpload(CloudScope scope, UUID actorId, UUID sessionId, CompleteUploadRequest req) {
        return uploads.completeUpload(scope, actorId, sessionId, req);
    }

    public void abortUpload(CloudScope scope, UUID sessionId) {
        uploads.abortUpload(scope, sessionId);
    }

    public CloudDownloadResponse download(CloudScope scope, UUID actorId, UUID nodeId) {
        return downloads.getDownloadUrl(scope, actorId, nodeId);
    }
}
