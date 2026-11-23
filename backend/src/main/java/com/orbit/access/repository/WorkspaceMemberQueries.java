package com.orbit.access.repository;

import com.orbit.access.dto.MemberDto;
import com.orbit.workspace.entity.WorkspaceMemberEntity;
import com.orbit.workspace.entity.WorkspaceMemberId;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

/** Read-side joins (member + user + role) that return API DTOs directly. */
public interface WorkspaceMemberQueries extends Repository<WorkspaceMemberEntity, WorkspaceMemberId> {

    @Query(
        value = """
            select new com.orbit.access.dto.MemberDto(
                u.id, u.username, u.displayName, u.email, r.id, r.name, m.subRole,
                case when w.ownerId = u.id then true else false end, m.joinedAt)
            from WorkspaceMemberEntity m
            join UserEntity u on u.id = m.id.userId
            join WorkspaceRoleEntity r on r.id = m.roleId
            join WorkspaceEntity w on w.id = m.id.workspaceId
            where m.id.workspaceId = :workspaceId
            order by m.joinedAt asc, u.username asc
            """,
        countQuery = "select count(m) from WorkspaceMemberEntity m where m.id.workspaceId = :workspaceId"
    )
    Page<MemberDto> findMembers(UUID workspaceId, Pageable pageable);

    @Query("""
        select new com.orbit.access.dto.MemberDto(
            u.id, u.username, u.displayName, u.email, r.id, r.name, m.subRole,
            case when w.ownerId = u.id then true else false end, m.joinedAt)
        from WorkspaceMemberEntity m
        join UserEntity u on u.id = m.id.userId
        join WorkspaceRoleEntity r on r.id = m.roleId
        join WorkspaceEntity w on w.id = m.id.workspaceId
        where m.id.workspaceId = :workspaceId and m.id.userId = :userId
        """)
    Optional<MemberDto> findMember(UUID workspaceId, UUID userId);

    @Query("""
        select count(m) > 0 from WorkspaceMemberEntity m
        join UserEntity u on u.id = m.id.userId
        where m.id.workspaceId = :workspaceId and lower(u.email) = :email
        """)
    boolean existsByEmail(UUID workspaceId, String email);
}
