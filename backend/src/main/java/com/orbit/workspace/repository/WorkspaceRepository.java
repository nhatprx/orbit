package com.orbit.workspace.repository;

import com.orbit.workspace.entity.WorkspaceEntity;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface WorkspaceRepository extends JpaRepository<WorkspaceEntity, UUID> {

    boolean existsBySlugIgnoreCase(String slug);

    Optional<WorkspaceEntity> findByIdAndDeletedAtIsNull(UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from WorkspaceEntity w where w.id = :id")
    Optional<WorkspaceEntity> findByIdForUpdate(UUID id);

    @Query(
        value = """
            select w from WorkspaceEntity w
            join WorkspaceMemberEntity m on m.id.workspaceId = w.id
            where m.id.userId = :userId and w.deletedAt is null
            """,
        countQuery = """
            select count(w) from WorkspaceEntity w
            join WorkspaceMemberEntity m on m.id.workspaceId = w.id
            where m.id.userId = :userId and w.deletedAt is null
            """
    )
    Page<WorkspaceEntity> findActiveForUser(UUID userId, Pageable pageable);

    @Query(
        value = """
            select w from WorkspaceEntity w
            join WorkspaceMemberEntity m on m.id.workspaceId = w.id
            where m.id.userId = :userId
              and (w.deletedAt is null or (w.ownerId = :userId and w.purgeAfter > :now))
            """,
        countQuery = """
            select count(w) from WorkspaceEntity w
            join WorkspaceMemberEntity m on m.id.workspaceId = w.id
            where m.id.userId = :userId
              and (w.deletedAt is null or (w.ownerId = :userId and w.purgeAfter > :now))
            """
    )
    Page<WorkspaceEntity> findActiveAndRestorableForUser(UUID userId, Instant now, Pageable pageable);

    List<WorkspaceEntity> findByDeletedAtIsNotNullAndPurgeAfterLessThanEqual(Instant now, Pageable pageable);
}
