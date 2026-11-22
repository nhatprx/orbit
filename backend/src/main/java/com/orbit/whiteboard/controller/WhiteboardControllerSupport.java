package com.orbit.whiteboard.controller;

import com.orbit.common.PageResponse;
import com.orbit.whiteboard.dto.CreateWhiteboardRequest;
import com.orbit.whiteboard.dto.SaveWhiteboardSceneRequest;
import com.orbit.whiteboard.dto.UpdateWhiteboardRequest;
import com.orbit.whiteboard.dto.UpsertWhiteboardAssetRequest;
import com.orbit.whiteboard.dto.WhiteboardAssetResponse;
import com.orbit.whiteboard.dto.WhiteboardDetailResponse;
import com.orbit.whiteboard.dto.WhiteboardSceneSaveResponse;
import com.orbit.whiteboard.dto.WhiteboardSummaryResponse;
import com.orbit.whiteboard.service.WhiteboardAssetService;
import com.orbit.whiteboard.service.WhiteboardScope;
import com.orbit.whiteboard.service.WhiteboardService;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Shared controller delegation layer for workspace- and project-scoped Whiteboard REST APIs. */
@Component
public class WhiteboardControllerSupport {

    private final WhiteboardService boards;
    private final WhiteboardAssetService assets;

    public WhiteboardControllerSupport(WhiteboardService boards, WhiteboardAssetService assets) {
        this.boards = boards;
        this.assets = assets;
    }

    public PageResponse<WhiteboardSummaryResponse> list(WhiteboardScope scope, String q, int page, int size) {
        return boards.list(scope, q, page, size);
    }

    public WhiteboardDetailResponse create(WhiteboardScope scope, UUID userId, CreateWhiteboardRequest req) {
        return boards.create(scope, userId, req);
    }

    public WhiteboardDetailResponse getDetail(WhiteboardScope scope, UUID boardId) {
        return boards.getDetail(scope, boardId);
    }

    public WhiteboardSummaryResponse updateMetadata(
        WhiteboardScope scope, UUID boardId, UUID userId, UpdateWhiteboardRequest req
    ) {
        return boards.updateMetadata(scope, boardId, userId, req);
    }

    public WhiteboardSceneSaveResponse saveScene(
        WhiteboardScope scope, UUID boardId, UUID userId, SaveWhiteboardSceneRequest req
    ) {
        return boards.saveScene(scope, boardId, userId, req);
    }

    public void delete(WhiteboardScope scope, UUID boardId) {
        boards.delete(scope, boardId);
    }

    public WhiteboardSummaryResponse setLocked(WhiteboardScope scope, UUID boardId, UUID actorId, boolean locked) {
        return boards.setLocked(scope, boardId, actorId, locked);
    }

    public List<WhiteboardAssetResponse> listAssets(WhiteboardScope scope, UUID boardId) {
        return assets.listAssets(scope, boardId);
    }

    public WhiteboardAssetResponse upsertAsset(
        WhiteboardScope scope, UUID boardId, UUID userId, String fileId, UpsertWhiteboardAssetRequest req
    ) {
        return assets.upsertAsset(scope, boardId, userId, fileId, req);
    }

    public void deleteAsset(WhiteboardScope scope, UUID boardId, String fileId) {
        assets.deleteAsset(scope, boardId, fileId);
    }
}
