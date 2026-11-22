package com.orbit.cloud;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.cloud.dto.MoveCloudNodesRequest;
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
import com.orbit.common.ApiException;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class CloudMoveEdgeCaseTest {

    private CloudAccessGuard guard;
    private CloudNodeRepository nodeRepo;
    private CloudNodeService nodeService;
    private CloudQuotaService quotaService;
    private CloudMoveService moveService;

    @BeforeEach
    void setUp() {
        guard = mock(CloudAccessGuard.class);
        nodeRepo = mock(CloudNodeRepository.class);
        nodeService = mock(CloudNodeService.class);
        quotaService = mock(CloudQuotaService.class);
        moveService = new CloudMoveService(guard, nodeRepo, nodeService, quotaService, mock(CloudNodeMapper.class));
    }

    @Test
    void rejectsFolderCycleIntoSelfOrDescendant() {
        UUID userId = UUID.randomUUID();
        CloudScope scope = CloudScope.user(userId);
        CloudNodeEntity parent = node(scope, CloudNodeType.FOLDER, "Parent", null, 0, 0L);
        CloudNodeEntity child = node(scope, CloudNodeType.FOLDER, "Child", parent.getId(), 1, 0L);

        when(guard.requireWriteScope(userId, CloudScopeType.USER, null, null)).thenReturn(scope);
        when(nodeService.requireActiveFolder(scope, parent.getId())).thenReturn(parent);
        when(nodeService.requireActiveFolder(scope, child.getId())).thenReturn(child);
        when(nodeRepo.findByIdInAndScopeTypeAndScopeId(Set.of(parent.getId()), CloudScopeType.USER, userId))
            .thenReturn(List.of(parent));
        when(nodeRepo.findSubtreeIds(parent.getId(), "USER", userId)).thenReturn(List.of(parent.getId(), child.getId()));
        when(nodeRepo.findAllById(Set.of(parent.getId(), child.getId()))).thenReturn(List.of(parent, child));

        ApiException selfCycle = assertThrows(ApiException.class, () -> moveService.moveNodes(userId,
            new MoveCloudNodesRequest(List.of(parent.getId()), CloudScopeType.USER, null, null,
                CloudScopeType.USER, null, null, parent.getId())));
        assertEquals("FOLDER_CYCLE", selfCycle.getCode());

        ApiException descCycle = assertThrows(ApiException.class, () -> moveService.moveNodes(userId,
            new MoveCloudNodesRequest(List.of(parent.getId()), CloudScopeType.USER, null, null,
                CloudScopeType.USER, null, null, child.getId())));
        assertEquals("FOLDER_CYCLE", descCycle.getCode());
        verify(nodeRepo, never()).saveAll(anyCollection());
    }

    @Test
    void rejectsMaxDepthExceededAndCrossScopeQuotaExceeded() {
        UUID userId = UUID.randomUUID();
        UUID wsId = UUID.randomUUID();
        CloudScope userScope = CloudScope.user(userId);
        CloudScope wsScope = CloudScope.workspace(wsId);

        CloudNodeEntity deepParent = node(userScope, CloudNodeType.FOLDER, "Deep", null, 20, 0L);
        CloudNodeEntity file = node(userScope, CloudNodeType.FILE, "big.pptx", null, 0, 50_000L);

        when(guard.requireWriteScope(userId, CloudScopeType.USER, null, null)).thenReturn(userScope);
        when(guard.requireWriteScope(userId, CloudScopeType.WORKSPACE, wsId, null)).thenReturn(wsScope);
        when(nodeService.requireActiveFolder(userScope, deepParent.getId())).thenReturn(deepParent);
        when(nodeRepo.findByIdInAndScopeTypeAndScopeId(Set.of(file.getId()), CloudScopeType.USER, userId))
            .thenReturn(List.of(file));

        ApiException depthEx = assertThrows(ApiException.class, () -> moveService.moveNodes(userId,
            new MoveCloudNodesRequest(List.of(file.getId()), CloudScopeType.USER, null, null,
                CloudScopeType.USER, null, null, deepParent.getId())));
        assertEquals("MAX_DEPTH_EXCEEDED", depthEx.getCode());

        doThrow(new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "QUOTA_EXCEEDED", "Quota exceeded."))
            .when(quotaService).transferUsedBytes(userScope, wsScope, 50_000L);

        ApiException quotaEx = assertThrows(ApiException.class, () -> moveService.moveNodes(userId,
            new MoveCloudNodesRequest(List.of(file.getId()), CloudScopeType.USER, null, null,
                CloudScopeType.WORKSPACE, wsId, null, null)));
        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, quotaEx.getStatus());
        assertEquals("QUOTA_EXCEEDED", quotaEx.getCode());
        verify(nodeRepo, never()).saveAll(anyCollection());
    }

    @Test
    void rejectsForbiddenScopeMissingNodeAndDeletedNode() {
        UUID userId = UUID.randomUUID();
        UUID wsId = UUID.randomUUID();
        CloudScope userScope = CloudScope.user(userId);

        when(guard.requireWriteScope(userId, CloudScopeType.USER, null, null)).thenReturn(userScope);
        when(guard.requireWriteScope(userId, CloudScopeType.WORKSPACE, wsId, null))
            .thenThrow(ApiException.forbidden("FORBIDDEN", "Missing files.write permission."));

        ApiException forbiddenTarget = assertThrows(ApiException.class, () -> moveService.moveNodes(userId,
            new MoveCloudNodesRequest(List.of(UUID.randomUUID()), CloudScopeType.USER, null, null,
                CloudScopeType.WORKSPACE, wsId, null, null)));
        assertEquals(HttpStatus.FORBIDDEN, forbiddenTarget.getStatus());

        ApiException forbiddenSource = assertThrows(ApiException.class, () -> moveService.moveNodes(userId,
            new MoveCloudNodesRequest(List.of(UUID.randomUUID()), CloudScopeType.WORKSPACE, wsId, null,
                CloudScopeType.USER, null, null, null)));
        assertEquals(HttpStatus.FORBIDDEN, forbiddenSource.getStatus());

        CloudNodeEntity deleted = node(userScope, CloudNodeType.FILE, "old.pdf", null, 0, 100L);
        deleted.setDeletedAt(Instant.now());
        when(nodeRepo.findByIdInAndScopeTypeAndScopeId(Set.of(deleted.getId()), CloudScopeType.USER, userId))
            .thenReturn(List.of(deleted));

        ApiException notFound = assertThrows(ApiException.class, () -> moveService.moveNodes(userId,
            new MoveCloudNodesRequest(List.of(deleted.getId()), CloudScopeType.USER, null, null,
                CloudScopeType.USER, null, null, null)));
        assertEquals(HttpStatus.NOT_FOUND, notFound.getStatus());
        verify(quotaService, never()).transferUsedBytes(any(), any(), anyLong());
    }

    private static CloudNodeEntity node(
        CloudScope scope, CloudNodeType type, String name, UUID parentId, int depth, long sizeBytes
    ) {
        CloudNodeEntity n = new CloudNodeEntity();
        n.setId(UUID.randomUUID());
        n.setScopeType(scope.type());
        n.setScopeId(scope.scopeId());
        n.setParentId(parentId);
        n.setNodeType(type);
        n.setName(name);
        n.setNameNormalized(name.toLowerCase());
        n.setSizeBytes(sizeBytes);
        n.setDepth(depth);
        n.setUploadStatus(CloudUploadStatus.READY);
        return n;
    }
}
