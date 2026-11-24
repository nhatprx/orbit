package com.orbit.auth.repository;

import com.orbit.auth.entity.OAuthAccountEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OAuthAccountRepository extends JpaRepository<OAuthAccountEntity, UUID> {

    Optional<OAuthAccountEntity> findByProviderAndProviderUserId(
        String provider,
        String providerUserId
    );

    List<OAuthAccountEntity> findByUserIdOrderByCreatedAtAsc(UUID userId);

    Optional<OAuthAccountEntity> findByUserIdAndProvider(UUID userId, String provider);

    List<OAuthAccountEntity> findByUserIdInAndProvider(java.util.Collection<UUID> userIds, String provider);

    Optional<OAuthAccountEntity> findByIdAndUserId(UUID id, UUID userId);

    long countByUserId(UUID userId);
}
