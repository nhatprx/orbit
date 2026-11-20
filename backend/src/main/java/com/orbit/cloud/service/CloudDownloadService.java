package com.orbit.cloud.service;

import com.orbit.cloud.dto.CloudDownloadResponse;
import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.common.ApiException;
import com.orbit.storage.service.CloudDownloadSigner;
import com.orbit.storage.service.CloudDownloadSigner.SignedDownloadUrl;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CloudDownloadService {

    private final CloudNodeService nodeService;
    private final CloudRateLimiter rateLimiter;
    private final CloudDownloadSigner downloadSigner;

    public CloudDownloadService(
        CloudNodeService nodeService,
        CloudRateLimiter rateLimiter,
        CloudDownloadSigner downloadSigner
    ) {
        this.nodeService = nodeService;
        this.rateLimiter = rateLimiter;
        this.downloadSigner = downloadSigner;
    }

    @Transactional(readOnly = true)
    public CloudDownloadResponse getDownloadUrl(CloudScope scope, UUID actorId, UUID nodeId) {
        rateLimiter.checkPresignLimit(actorId, "download");
        CloudNodeEntity node = nodeService.requireActiveNode(scope, nodeId);
        if (node.getNodeType() != CloudNodeType.FILE || node.getStorageKey() == null) {
            throw ApiException.badRequest("CANNOT_DOWNLOAD_FOLDER", "Folders cannot be downloaded directly.");
        }
        SignedDownloadUrl signed = downloadSigner.signDownload(
            node.getStorageKey(), node.getName(), node.getMimeType()
        );
        return new CloudDownloadResponse(
            signed.url(),
            signed.expiresAt(),
            signed.provider(),
            node.getName(),
            node.getMimeType(),
            node.getSizeBytes()
        );
    }
}
