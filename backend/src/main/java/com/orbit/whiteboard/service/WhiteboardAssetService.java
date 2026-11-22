package com.orbit.whiteboard.service;

import com.orbit.common.ApiException;
import com.orbit.common.Timestamps;
import com.orbit.whiteboard.dto.UpsertWhiteboardAssetRequest;
import com.orbit.whiteboard.dto.WhiteboardAssetResponse;
import com.orbit.whiteboard.entity.WhiteboardAssetEntity;
import com.orbit.whiteboard.repository.WhiteboardAssetRepository;
import com.orbit.whiteboard.service.WhiteboardValidation.ValidatedAsset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Manages binary image assets embedded in a Whiteboard (max 50 per board, 5 MB each). */
@Service
public class WhiteboardAssetService {

    private final WhiteboardService whiteboardService;
    private final WhiteboardAssetRepository assets;

    public WhiteboardAssetService(WhiteboardService whiteboardService, WhiteboardAssetRepository assets) {
        this.whiteboardService = whiteboardService;
        this.assets = assets;
    }

    @Transactional(readOnly = true)
    public List<WhiteboardAssetResponse> listAssets(WhiteboardScope scope, UUID boardId) {
        whiteboardService.requireBoardExistsInScope(scope, boardId);
        return assets.findByWhiteboardIdOrderByCreatedAtAsc(
            boardId, PageRequest.of(0, WhiteboardValidation.MAX_ASSETS_PER_BOARD)
        ).stream().map(WhiteboardAssetResponse::from).toList();
    }

    @Transactional
    public WhiteboardAssetResponse upsertAsset(
        WhiteboardScope scope, UUID boardId, UUID userId, String fileId, UpsertWhiteboardAssetRequest request
    ) {
        ValidatedAsset validated = WhiteboardValidation.validateAsset(fileId, request);
        whiteboardService.requireBoardExistsInScope(scope, boardId);

        Optional<WhiteboardAssetEntity> existing = assets.findByWhiteboardIdAndFileId(boardId, validated.fileId());
        if (existing.isPresent()) {
            WhiteboardAssetEntity entity = existing.get();
            entity.setMimeType(validated.mimeType());
            entity.setDataUrl(validated.dataUrl());
            entity.setByteSize(validated.byteSize());
            return WhiteboardAssetResponse.from(assets.save(entity));
        }

        if (assets.countByWhiteboardId(boardId) >= WhiteboardValidation.MAX_ASSETS_PER_BOARD) {
            throw ApiException.badRequest(
                "WHITEBOARD_ASSET_LIMIT_EXCEEDED",
                "A whiteboard can store at most 50 distinct assets."
            );
        }

        WhiteboardAssetEntity entity = new WhiteboardAssetEntity();
        entity.setId(UUID.randomUUID());
        entity.setWhiteboardId(boardId);
        entity.setFileId(validated.fileId());
        entity.setMimeType(validated.mimeType());
        entity.setDataUrl(validated.dataUrl());
        entity.setByteSize(validated.byteSize());
        entity.setCreatedBy(userId);
        entity.setCreatedAt(Timestamps.now());
        return WhiteboardAssetResponse.from(assets.save(entity));
    }

    @Transactional
    public void deleteAsset(WhiteboardScope scope, UUID boardId, String fileId) {
        String validId = WhiteboardValidation.requireFileId(fileId);
        whiteboardService.requireBoardExistsInScope(scope, boardId);
        assets.deleteByWhiteboardIdAndFileId(boardId, validId);
    }
}
