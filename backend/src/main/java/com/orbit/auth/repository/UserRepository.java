package com.orbit.auth.repository;

import com.orbit.auth.entity.UserEntity;
import java.util.Optional;
import java.util.UUID;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);

    Optional<UserEntity> findByUsernameIgnoreCase(String username);

    Optional<UserEntity> findByEmailIgnoreCase(String email);

    @Query("""
        select distinct u from UserEntity u where lower(u.username) in :usernames and u.id <> :actorId
          and (exists(select pm from ProjectMemberEntity pm where pm.id.projectId = :projectId and pm.id.userId = u.id)
            or exists(select wm from WorkspaceMemberEntity wm where wm.id.workspaceId = :workspaceId and wm.id.userId = u.id))
        """)
    List<UserEntity> findIssueMentionRecipients(
        @Param("usernames") Collection<String> usernames,
        @Param("projectId") UUID projectId,
        @Param("workspaceId") UUID workspaceId,
        @Param("actorId") UUID actorId
    );

    @Query("""
        select distinct u from UserEntity u where lower(u.username) in :usernames and u.id <> :actorId
          and exists(select wm from WorkspaceMemberEntity wm where wm.id.workspaceId = :workspaceId and wm.id.userId = u.id)
        """)
    List<UserEntity> findWorkspaceMentionRecipients(
        @Param("usernames") Collection<String> usernames,
        @Param("workspaceId") UUID workspaceId,
        @Param("actorId") UUID actorId
    );

    @Query("""
        select distinct u from UserEntity u where u.id <> :actorId
          and ((:projectId is not null and exists(select pm from ProjectMemberEntity pm where pm.id.projectId = :projectId and pm.id.userId = u.id))
            or (:projectId is null and exists(select wm from WorkspaceMemberEntity wm where wm.id.workspaceId = :workspaceId and wm.id.userId = u.id)))
        """)
    List<UserEntity> findAllScopeMembersExcept(
        @Param("workspaceId") UUID workspaceId,
        @Param("projectId") UUID projectId,
        @Param("actorId") UUID actorId
    );
}
