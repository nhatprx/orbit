package com.orbit.access.repository;

import com.orbit.access.entity.InvitationEntity;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface InvitationRepository extends JpaRepository<InvitationEntity, UUID> {

    Optional<InvitationEntity> findByToken(String token);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from InvitationEntity i where i.token = :token")
    Optional<InvitationEntity> findByTokenForUpdate(String token);

    Optional<InvitationEntity> findByIdAndWorkspaceId(UUID id, UUID workspaceId);

    Page<InvitationEntity> findByWorkspaceId(UUID workspaceId, Pageable pageable);

    @Query("""
        select count(i) > 0 from InvitationEntity i
        where i.workspaceId = :workspaceId and i.projectId is null
          and i.type = com.orbit.access.entity.InvitationType.EMAIL
          and i.status = com.orbit.access.entity.InvitationStatus.PENDING
          and i.expiresAt > :now and lower(i.email) = :email
        """)
    boolean existsPendingWorkspaceEmail(UUID workspaceId, String email, Instant now);

    @Query("""
        select count(i) > 0 from InvitationEntity i
        where i.workspaceId = :workspaceId and i.projectId = :projectId
          and i.type = com.orbit.access.entity.InvitationType.EMAIL
          and i.status = com.orbit.access.entity.InvitationStatus.PENDING
          and i.expiresAt > :now and lower(i.email) = :email
        """)
    boolean existsPendingProjectEmail(UUID workspaceId, UUID projectId, String email, Instant now);
}
