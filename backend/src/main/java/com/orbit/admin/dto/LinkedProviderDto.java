package com.orbit.admin.dto;

import com.orbit.auth.entity.OAuthAccountEntity;
import java.time.Instant;

/** A social sign-in linked to the account. The provider's own user id is deliberately omitted. */
public record LinkedProviderDto(String provider, String providerEmail, Instant connectedAt) {

    public static LinkedProviderDto from(OAuthAccountEntity entity) {
        return new LinkedProviderDto(entity.getProvider(), entity.getProviderEmail(), entity.getCreatedAt());
    }
}
