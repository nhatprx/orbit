package com.orbit.cloud;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.cloud.dto.CloudNodeResponse;
import com.orbit.cloud.dto.MoveCloudNodesRequest;
import com.orbit.cloud.dto.MoveCloudNodesResponse;
import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.cloud.entity.CloudScopeType;
import com.orbit.cloud.entity.CloudUploadStatus;
import com.orbit.cloud.repository.CloudNodeRepository;
import com.orbit.cloud.service.CloudAccessGuard;
import com.orbit.cloud.service.CloudMoveService;
import com.orbit.cloud.service.CloudNodeMapper;
import com.orbit.cloud.service.CloudNodeService;
import com.orbit.cloud.service.CloudQuotaService;
import com.orbit.cloud.service.CloudScope;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CloudMoveServiceTest {

    private CloudAccessGuard guard;
    private CloudNodeRepository nodeRepo;
    private CloudNodeService nodeService;
    private CloudQuotaService quotaService;
    private CloudNodeMapper mapper;
    private CloudMoveService moveService;

    @BeforeEach
    void setUp() {
        guard = mock(CloudAccessGuard.class);
        nodeRepo = mock(CloudNodeRepository.class);
        nodeService = mock(CloudNodeService.class);
        quotaService = mock(CloudQuotaService.class);
        mapper = mock(CloudNodeMapper.class);
        moveService = new CloudMoveService(guard, nodeRepo, nodeService, quotaService, mapper);
        when(mapper.toResponses(anyCollection())).thenAnswer(inv -> {
            @SuppressWarnings("unchecked")
            List<CloudNodeEntity> nodes = List.copyOf(inv.getArgument(0));
            return nodes.stream().map(n -> new CloudNodeResponse(
                n.getId(), n.getScopeType(), n.getScopeId(), n.getParentId(), n.getNodeType(),
                n.getName(), n.getMimeType(), n.getSizeBytes(), n.isStarred(), n.getDepth(),
                n.getCreatedBy(), "User", n.getDeletedAt(), n.getPurgeAfter(), n.getCreatedAt(), n.getUpdatedAt(), "/"
            )).toList();
        });
    }

    @Test
    void movesFolderSubtreeAcrossUserWorkspaceAndProjectScopesAndTransfersQuota() {
        UUID userId = UUID.randomUUID();
        UUID wsId = UUID.randomUUID();
        UUID projId = UUID.randomUUID();
        CloudScope userScope = CloudScope.user(userId);
        CloudScope wsScope = CloudScope.workspace(wsId);
        CloudScope projScope = CloudScope.project(wsId, projId);

        CloudNodeEntity folder = node(userScope, CloudNodeType.FOLDER, "Specs", null, 0, 0L);
        CloudNodeEntity child = node(userScope, CloudNodeType.FILE, "arch.docx", folder.getId(), 1, 2048L);
        CloudNodeEntity wsDest = node(wsScope, CloudNodeType.FOLDER, "Shared", null, 0, 0L);

        when(guard.requireWriteScope(userId, CloudScopeType.USER, null, null)).thenReturn(userScope);
        when(guard.requireWriteScope(userId, CloudScopeType.WORKSPACE, wsId, null)).thenReturn(wsScope);
        when(nodeService.requireActiveFolder(wsScope, wsDest.getId())).thenReturn(wsDest);
        when(nodeRepo.findByIdInAndScopeTypeAndScopeId(Set.of(folder.getId(), child.getId()), CloudScopeType.USER, userId))
            .thenReturn(List.of(folder, child));
        when(nodeRepo.findSubtreeIds(folder.getId(), "USER", userId)).thenReturn(List.of(folder.getId(), child.getId()));
        when(nodeRepo.findAllById(Set.of(folder.getId(), child.getId()))).thenReturn(List.of(folder, child));
        when(nodeRepo.findActiveSiblings(CloudScopeType.WORKSPACE, wsId, wsDest.getId())).thenReturn(List.of());

        MoveCloudNodesResponse res = moveService.moveNodes(userId, new MoveCloudNodesRequest(
            List.of(folder.getId(), child.getId()),
            CloudScopeType.USER, null, null,
            CloudScopeType.WORKSPACE, wsId, null, wsDest.getId()
        ));

        assertEquals(1, res.moved().size());
        assertEquals(CloudScopeType.WORKSPACE, folder.getScopeType());
        assertEquals(wsId, folder.getWorkspaceId());
        assertEquals(wsDest.getId(), folder.getParentId());
        assertEquals(1, folder.getDepth());
        assertEquals(CloudScopeType.WORKSPACE, child.getScopeType());
        assertEquals(wsId, child.getWorkspaceId());
        assertEquals(2, child.getDepth());
        verify(quotaService).transferUsedBytes(userScope, wsScope, 2048L);

        when(guard.requireWriteScope(userId, CloudScopeType.PROJECT, wsId, projId)).thenReturn(projScope);
        when(nodeRepo.findByIdInAndScopeTypeAndScopeId(Set.of(child.getId()), CloudScopeType.WORKSPACE, wsId))
            .thenReturn(List.of(child));
        when(nodeRepo.findActiveSiblings(CloudScopeType.PROJECT, projId, null)).thenReturn(List.of());

        moveService.moveNodes(userId, new MoveCloudNodesRequest(
            List.of(child.getId()),
            CloudScopeType.WORKSPACE, wsId, null,
            CloudScopeType.PROJECT, wsId, projId, null
        ));

        assertEquals(CloudScopeType.PROJECT, child.getScopeType());
        assertEquals(projId, child.getProjectId());
        assertEquals(0, child.getDepth());
        verify(quotaService).transferUsedBytes(wsScope, projScope, 2048L);
    }

    @Test
    void finderStyleAutoRenameResolvesFileFolderAndBatchCollisions() {
        UUID userId = UUID.randomUUID();
        CloudScope scope = CloudScope.user(userId);
        CloudNodeEntity dest = node(scope, CloudNodeType.FOLDER, "Archive", null, 0, 0L);

        CloudNodeEntity existing1 = node(scope, CloudNodeType.FILE, "demo.docx", dest.getId(), 1, 100L);
        CloudNodeEntity existing2 = node(scope, CloudNodeType.FILE, "demo (1).docx", dest.getId(), 1, 100L);
        CloudNodeEntity existingFolder = node(scope, CloudNodeType.FOLDER, "Reports", dest.getId(), 1, 0L);

        CloudNodeEntity movingFileA = node(scope, CloudNodeType.FILE, "demo.docx", null, 0, 500L);
        CloudNodeEntity movingFileB = node(scope, CloudNodeType.FILE, "demo.docx", UUID.randomUUID(), 1, 500L);
        CloudNodeEntity movingFolder = node(scope, CloudNodeType.FOLDER, "Reports", null, 0, 0L);

        when(guard.requireWriteScope(userId, CloudScopeType.USER, null, null)).thenReturn(scope);
        when(nodeService.requireActiveFolder(scope, dest.getId())).thenReturn(dest);
        when(nodeRepo.findByIdInAndScopeTypeAndScopeId(anyCollection(), any(), any()))
            .thenReturn(List.of(movingFileA, movingFileB, movingFolder));
        when(nodeRepo.findSubtreeIds(movingFolder.getId(), "USER", userId)).thenReturn(List.of(movingFolder.getId()));
        when(nodeRepo.findAllById(Set.of(movingFolder.getId()))).thenReturn(List.of(movingFolder));
        when(nodeRepo.findActiveSiblings(CloudScopeType.USER, userId, dest.getId()))
            .thenReturn(List.of(existing1, existing2, existingFolder));

        MoveCloudNodesResponse res = moveService.moveNodes(userId, new MoveCloudNodesRequest(
            List.of(movingFileA.getId(), movingFileB.getId(), movingFolder.getId()),
            CloudScopeType.USER, null, null,
            CloudScopeType.USER, null, null, dest.getId()
        ));

        assertEquals(3, res.moved().size());
        assertEquals("demo (2).docx", movingFileA.getName());
        assertEquals("demo (3).docx", movingFileB.getName());
        assertEquals("Reports (1)", movingFolder.getName());
    }

    private static CloudNodeEntity node(
        CloudScope scope, CloudNodeType type, String name, UUID parentId, int depth, long sizeBytes
    ) {
        CloudNodeEntity n = new CloudNodeEntity();
        n.setId(UUID.randomUUID());
        n.setScopeType(scope.type());
        n.setScopeId(scope.scopeId());
        n.setWorkspaceId(scope.workspaceId());
        n.setProjectId(scope.projectId());
        n.setParentId(parentId);
        n.setNodeType(type);
        n.setName(name);
        n.setNameNormalized(name.toLowerCase());
        n.setSizeBytes(sizeBytes);
        n.setDepth(depth);
        n.setUploadStatus(CloudUploadStatus.READY);
        n.setCreatedBy(UUID.randomUUID());
        n.setUpdatedBy(UUID.randomUUID());
        return n;
    }
}
