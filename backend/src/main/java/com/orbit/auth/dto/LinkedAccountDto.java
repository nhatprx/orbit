package com.orbit.auth.dto;

import com.orbit.auth.entity.OAuthAccountEntity;
import java.time.Instant;

public record LinkedAccountDto(
    String id,
    String provider,
    String providerUserId,
    String providerEmail,
    String displayName,
    Instant connectedAt
) {

    public static LinkedAccountDto from(OAuthAccountEntity entity) {
        String email = entity.getProviderEmail() != null ? entity.getProviderEmail() : "";
        String display = entity.getProviderDisplayName();
        if (display == null || display.isBlank()) {
            display = email.contains("@") ? email.split("@")[0] : entity.getProviderUserId();
        }
        return new LinkedAccountDto(
            entity.getId().toString(),
            entity.getProvider(),
            entity.getProviderUserId(),
            email,
            display,
            entity.getCreatedAt()
        );
    }
}
