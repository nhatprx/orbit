package com.orbit.auth.repository;

import com.orbit.auth.entity.UserEntity;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<UserEntity, UUID>, JpaSpecificationExecutor<UserEntity> {

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);

    Optional<UserEntity> findByUsernameIgnoreCase(String username);

    Optional<UserEntity> findByEmailIgnoreCase(String email);

    long countByRoleIgnoreCase(String role);

    long countByCreatedAtGreaterThanEqual(Instant since);

    @Query("select count(u) from UserEntity u where u.accountStatus.disabledAt is not null")
    long countDisabled();

    /**
     * Row-locks every active admin in a stable order. Callers that remove an admin (demote or
     * disable) lock first, so two concurrent removals cannot both pass the "another admin exists" check.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select u from UserEntity u
        where lower(u.role) = 'admin' and u.accountStatus.disabledAt is null
        order by u.id
        """)
    List<UserEntity> lockActiveAdmins();
}
