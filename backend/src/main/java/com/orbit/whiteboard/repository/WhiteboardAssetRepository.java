package com.orbit.whiteboard.repository;

import com.orbit.whiteboard.entity.WhiteboardAssetEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WhiteboardAssetRepository extends JpaRepository<WhiteboardAssetEntity, UUID> {

    List<WhiteboardAssetEntity> findByWhiteboardIdOrderByCreatedAtAsc(UUID whiteboardId, Pageable pageable);

    Optional<WhiteboardAssetEntity> findByWhiteboardIdAndFileId(UUID whiteboardId, String fileId);

    long countByWhiteboardId(UUID whiteboardId);

    void deleteByWhiteboardIdAndFileId(UUID whiteboardId, String fileId);
}
