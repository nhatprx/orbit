package com.orbit.whiteboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.common.ApiException;
import com.orbit.project.repository.ProjectModuleRepository;
import com.orbit.whiteboard.dto.SaveWhiteboardSceneRequest;
import com.orbit.whiteboard.dto.UpsertWhiteboardAssetRequest;
import com.orbit.whiteboard.dto.WhiteboardAssetResponse;
import com.orbit.whiteboard.dto.WhiteboardSceneSaveResponse;
import com.orbit.whiteboard.entity.WhiteboardAssetEntity;
import com.orbit.whiteboard.repository.WhiteboardAssetRepository;
import com.orbit.whiteboard.repository.WhiteboardRepository;
import com.orbit.whiteboard.service.WhiteboardAccessGuard;
import com.orbit.whiteboard.service.WhiteboardAssetService;
import com.orbit.whiteboard.service.WhiteboardScope;
import com.orbit.whiteboard.service.WhiteboardService;
import com.orbit.whiteboard.service.WhiteboardValidation;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator;
import com.orbit.workspace.repository.KeyValue;
import com.orbit.workspace.service.WorkspaceModuleService;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class WhiteboardServiceUnitTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void accessGuardEnforcesModuleEnablementForWorkspaceAndProject() {
        WorkspacePermissionEvaluator evaluator = mock(WorkspacePermissionEvaluator.class);
        WorkspaceModuleService wsModules = mock(WorkspaceModuleService.class);
        ProjectModuleRepository projectModules = mock(ProjectModuleRepository.class);
        WhiteboardAccessGuard guard = new WhiteboardAccessGuard(evaluator, wsModules, projectModules);

        UUID userId = UUID.randomUUID();
        UUID wsId = UUID.randomUUID();
        UUID projId = UUID.randomUUID();

        when(wsModules.enabledKeys(wsId)).thenReturn(Set.of("git"));
        ApiException wsDisabled = assertThrows(
            ApiException.class, () -> guard.requireWorkspaceScope(userId, wsId, Permissions.WHITEBOARD_READ)
        );
        assertEquals(HttpStatus.FORBIDDEN, wsDisabled.getStatus());
        assertEquals("MODULE_DISABLED", wsDisabled.getCode());

        when(wsModules.enabledKeys(wsId)).thenReturn(Set.of("whiteboard"));
        assertEquals(WhiteboardScope.workspace(wsId), guard.requireWorkspaceScope(userId, wsId, Permissions.WHITEBOARD_READ));

        when(projectModules.findEffectiveEnabled(List.of(projId))).thenReturn(List.of());
        ApiException projDisabled = assertThrows(
            ApiException.class, () -> guard.requireProjectScope(userId, wsId, projId, Permissions.PWHITEBOARD_READ)
        );
        assertEquals("MODULE_DISABLED", projDisabled.getCode());

        KeyValue kv = mock(KeyValue.class);
        when(kv.value()).thenReturn("whiteboard");
        when(projectModules.findEffectiveEnabled(List.of(projId))).thenReturn(List.of(kv));
        assertEquals(
            WhiteboardScope.project(wsId, projId),
            guard.requireProjectScope(userId, wsId, projId, Permissions.PWHITEBOARD_READ)
        );
    }

    @Test
    void saveSceneHandlesSuccessConflictAndConcurrentDelete() {
        WhiteboardRepository boards = mock(WhiteboardRepository.class);
        WhiteboardService service = new WhiteboardService(boards, mapper);
        UUID wsId = UUID.randomUUID();
        UUID boardId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        WhiteboardScope scope = WhiteboardScope.workspace(wsId);
        SaveWhiteboardSceneRequest req = new SaveWhiteboardSceneRequest(3L, WhiteboardValidation.defaultScene(mapper), 4);

        when(boards.existsByIdAndWorkspaceIdAndProjectIdIsNull(boardId, wsId)).thenReturn(true);
        when(boards.updateWorkspaceSceneIfVersionMatches(any(), any(), anyLong(), anyString(), anyInt(), any(), any()))
            .thenReturn(1);

        WhiteboardSceneSaveResponse saved = service.saveScene(scope, boardId, userId, req);
        assertEquals(4L, saved.version());
        assertEquals(4, saved.elementCount());

        when(boards.updateWorkspaceSceneIfVersionMatches(any(), any(), anyLong(), anyString(), anyInt(), any(), any()))
            .thenReturn(0);
        ApiException conflict = assertThrows(ApiException.class, () -> service.saveScene(scope, boardId, userId, req));
        assertEquals(HttpStatus.CONFLICT, conflict.getStatus());
        assertEquals("WHITEBOARD_VERSION_CONFLICT", conflict.getCode());

        when(boards.existsByIdAndWorkspaceIdAndProjectIdIsNull(boardId, wsId)).thenReturn(true, false);
        ApiException deleted = assertThrows(ApiException.class, () -> service.saveScene(scope, boardId, userId, req));
        assertEquals(HttpStatus.NOT_FOUND, deleted.getStatus());
        assertEquals("WHITEBOARD_NOT_FOUND", deleted.getCode());
    }

    @Test
    void assetServiceEnforcesFiftyAssetLimitWhileAllowingIdempotentUpdates() {
        WhiteboardService boardService = mock(WhiteboardService.class);
        WhiteboardAssetRepository assets = mock(WhiteboardAssetRepository.class);
        WhiteboardAssetService service = new WhiteboardAssetService(boardService, assets);

        UUID wsId = UUID.randomUUID();
        UUID boardId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        WhiteboardScope scope = WhiteboardScope.workspace(wsId);
        String b64 = Base64.getEncoder().encodeToString("pngdata".getBytes(StandardCharsets.UTF_8));
        UpsertWhiteboardAssetRequest req = new UpsertWhiteboardAssetRequest("image/png", "data:image/png;base64," + b64);

        when(assets.findByWhiteboardIdAndFileId(boardId, "asset_51")).thenReturn(Optional.empty());
        when(assets.countByWhiteboardId(boardId)).thenReturn(50L);
        ApiException limit = assertThrows(
            ApiException.class, () -> service.upsertAsset(scope, boardId, userId, "asset_51", req)
        );
        assertEquals(HttpStatus.BAD_REQUEST, limit.getStatus());
        assertEquals("WHITEBOARD_ASSET_LIMIT_EXCEEDED", limit.getCode());

        WhiteboardAssetEntity existing = new WhiteboardAssetEntity();
        existing.setId(UUID.randomUUID());
        existing.setWhiteboardId(boardId);
        existing.setFileId("asset_1");
        existing.setMimeType("image/png");
        existing.setDataUrl("old");
        existing.setByteSize(1);
        existing.setCreatedAt(Instant.now());
        when(assets.findByWhiteboardIdAndFileId(boardId, "asset_1")).thenReturn(Optional.of(existing));
        when(assets.save(existing)).thenReturn(existing);

        WhiteboardAssetResponse updated = service.upsertAsset(scope, boardId, userId, "asset_1", req);
        assertEquals("asset_1", updated.fileId());
        assertEquals(7, updated.byteSize());
        verify(assets).save(existing);
    }
}
