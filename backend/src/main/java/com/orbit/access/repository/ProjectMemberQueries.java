package com.orbit.access.repository;

import com.orbit.access.dto.MemberDto;
import com.orbit.project.entity.ProjectMemberEntity;
import com.orbit.project.entity.ProjectMemberId;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

/** Read-side joins (member + user + role) for Project membership. */
public interface ProjectMemberQueries extends Repository<ProjectMemberEntity, ProjectMemberId> {

    @Query(
        value = """
            select new com.orbit.access.dto.MemberDto(
                u.id, u.username, u.displayName, u.email, r.id, r.name, pm.subRole,
                case when (r.system = true and r.immutable = true) then true else false end,
                pm.joinedAt)
            from ProjectMemberEntity pm
            join UserEntity u on u.id = pm.id.userId
            join ProjectRoleEntity r on r.id = pm.roleId
            where pm.id.projectId = :projectId
            order by pm.joinedAt asc, u.username asc
            """,
        countQuery = "select count(pm) from ProjectMemberEntity pm where pm.id.projectId = :projectId"
    )
    Page<MemberDto> findMembers(UUID projectId, Pageable pageable);

    @Query("""
        select new com.orbit.access.dto.MemberDto(
            u.id, u.username, u.displayName, u.email, r.id, r.name, pm.subRole,
            case when (r.system = true and r.immutable = true) then true else false end,
            pm.joinedAt)
        from ProjectMemberEntity pm
        join UserEntity u on u.id = pm.id.userId
        join ProjectRoleEntity r on r.id = pm.roleId
        where pm.id.projectId = :projectId and pm.id.userId = :userId
        """)
    Optional<MemberDto> findMember(UUID projectId, UUID userId);

    @Query("""
        select count(pm) > 0 from ProjectMemberEntity pm
        join UserEntity u on u.id = pm.id.userId
        where pm.id.projectId = :projectId and lower(u.email) = :email
        """)
    boolean existsByEmail(UUID projectId, String email);

    @Query("""
        select count(pm) from ProjectMemberEntity pm
        join ProjectRoleEntity r on r.id = pm.roleId
        where pm.id.projectId = :projectId and r.system = true and r.immutable = true
        """)
    long countOwners(UUID projectId);
}
