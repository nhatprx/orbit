package com.orbit.auth.repository;

import com.orbit.auth.entity.OAuthAccountEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OAuthAccountRepository extends JpaRepository<OAuthAccountEntity, UUID> {

    Optional<OAuthAccountEntity> findByProviderAndProviderUserId(
        String provider,
        String providerUserId
    );
}
