package com.orbit.whiteboard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.common.ApiException;
import com.orbit.common.PageParams;
import com.orbit.common.PageResponse;
import com.orbit.common.Timestamps;
import com.orbit.whiteboard.dto.CreateWhiteboardRequest;
import com.orbit.whiteboard.dto.SaveWhiteboardSceneRequest;
import com.orbit.whiteboard.dto.UpdateWhiteboardRequest;
import com.orbit.whiteboard.dto.WhiteboardDetailResponse;
import com.orbit.whiteboard.dto.WhiteboardSceneSaveResponse;
import com.orbit.whiteboard.dto.WhiteboardSummaryResponse;
import com.orbit.whiteboard.entity.WhiteboardEntity;
import com.orbit.whiteboard.repository.WhiteboardRepository;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Manages scoped Whiteboard CRUD and optimistic-locking scene persistence. */
@Service
public class WhiteboardService {

    private final WhiteboardRepository boards;
    private final ObjectMapper mapper;

    public WhiteboardService(WhiteboardRepository boards, ObjectMapper mapper) {
        this.boards = boards;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public PageResponse<WhiteboardSummaryResponse> list(WhiteboardScope scope, String query, int page, int size) {
        Pageable pageable = PageParams.of(page, size);
        String pattern = WhiteboardValidation.toSearchPattern(query);
        Page<WhiteboardSummaryResponse> result;
        if (scope.isProject()) {
            result = pattern == null
                ? boards.findProjectSummaries(scope.workspaceId(), scope.projectId(), pageable)
                : boards.searchProjectSummaries(scope.workspaceId(), scope.projectId(), pattern, pageable);
        } else {
            result = pattern == null
                ? boards.findWorkspaceSummaries(scope.workspaceId(), pageable)
                : boards.searchWorkspaceSummaries(scope.workspaceId(), pattern, pageable);
        }
        return PageResponse.of(result);
    }

    @Transactional
    public WhiteboardDetailResponse create(WhiteboardScope scope, UUID userId, CreateWhiteboardRequest request) {
        if (request == null) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Request body is required.");
        }
        String title = WhiteboardValidation.requireTitle(request.title());
        String description = WhiteboardValidation.normalizeDescription(request.description());
        Instant now = Timestamps.now();

        WhiteboardEntity entity = new WhiteboardEntity();
        entity.setId(UUID.randomUUID());
        entity.setWorkspaceId(scope.workspaceId());
        entity.setProjectId(scope.projectId());
        entity.setTitle(title);
        entity.setDescription(description);
        entity.setSceneJson(WhiteboardValidation.defaultScene(mapper));
        entity.setElementCount(0);
        entity.setVersion(1L);
        entity.setCreatedBy(userId);
        entity.setUpdatedBy(userId);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);

        return WhiteboardDetailResponse.from(boards.save(entity));
    }

    @Transactional(readOnly = true)
    public WhiteboardDetailResponse getDetail(WhiteboardScope scope, UUID boardId) {
        return WhiteboardDetailResponse.from(requireScopedBoard(scope, boardId));
    }

    @Transactional
    public WhiteboardSummaryResponse updateMetadata(
        WhiteboardScope scope, UUID boardId, UUID userId, UpdateWhiteboardRequest request
    ) {
        if (request == null) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Request body is required.");
        }
        WhiteboardEntity entity = requireScopedBoard(scope, boardId);
        if (request.title() != null) {
            entity.setTitle(WhiteboardValidation.requireTitle(request.title()));
        }
        if (request.description() != null) {
            entity.setDescription(WhiteboardValidation.normalizeDescription(request.description()));
        }
        entity.setUpdatedBy(userId);
        entity.setUpdatedAt(Timestamps.now());
        return WhiteboardSummaryResponse.from(boards.save(entity));
    }

    @Transactional
    public WhiteboardSceneSaveResponse saveScene(
        WhiteboardScope scope, UUID boardId, UUID userId, SaveWhiteboardSceneRequest request
    ) {
        String serializedScene = WhiteboardValidation.validateAndSerializeScene(request, mapper);
        requireBoardExistsInScope(scope, boardId);

        Instant now = Timestamps.now();
        int updated = scope.isProject()
            ? boards.updateProjectSceneIfVersionMatches(
                boardId, scope.workspaceId(), scope.projectId(),
                request.expectedVersion(), serializedScene, request.elementCount(), userId, now
            )
            : boards.updateWorkspaceSceneIfVersionMatches(
                boardId, scope.workspaceId(),
                request.expectedVersion(), serializedScene, request.elementCount(), userId, now
            );

        if (updated == 0) {
            if (existsInScope(scope, boardId)) {
                throw ApiException.conflict(
                    "WHITEBOARD_VERSION_CONFLICT",
                    "Whiteboard was modified by another session. Reload or overwrite to continue."
                );
            }
            throw notFound();
        }
        return new WhiteboardSceneSaveResponse(
            boardId, request.expectedVersion() + 1, request.elementCount(), userId, now
        );
    }

    @Transactional
    public void delete(WhiteboardScope scope, UUID boardId) {
        WhiteboardEntity entity = requireScopedBoard(scope, boardId);
        boards.delete(entity);
    }

    public void requireBoardExistsInScope(WhiteboardScope scope, UUID boardId) {
        if (!existsInScope(scope, boardId)) {
            throw notFound();
        }
    }

    private WhiteboardEntity requireScopedBoard(WhiteboardScope scope, UUID boardId) {
        return (scope.isProject()
            ? boards.findByIdAndWorkspaceIdAndProjectId(boardId, scope.workspaceId(), scope.projectId())
            : boards.findByIdAndWorkspaceIdAndProjectIdIsNull(boardId, scope.workspaceId()))
            .orElseThrow(WhiteboardService::notFound);
    }

    private boolean existsInScope(WhiteboardScope scope, UUID boardId) {
        return scope.isProject()
            ? boards.existsByIdAndWorkspaceIdAndProjectId(boardId, scope.workspaceId(), scope.projectId())
            : boards.existsByIdAndWorkspaceIdAndProjectIdIsNull(boardId, scope.workspaceId());
    }

    private static ApiException notFound() {
        return ApiException.notFound("WHITEBOARD_NOT_FOUND", "Whiteboard not found.");
    }
}
