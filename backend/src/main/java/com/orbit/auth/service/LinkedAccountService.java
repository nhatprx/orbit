package com.orbit.auth.service;

import com.orbit.auth.dto.LinkedAccountDto;
import com.orbit.auth.dto.OAuthLinkStartResponse;
import com.orbit.auth.entity.OAuthAccountEntity;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.OAuthAccountRepository;
import com.orbit.auth.repository.UserRepository;
import com.orbit.common.ApiException;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LinkedAccountService {

    private static final Set<String> SUPPORTED_PROVIDERS = Set.of("google", "github");

    private final UserRepository userRepository;
    private final OAuthAccountRepository oauthAccountRepository;
    private final AuthEphemeralStore ephemeralStore;

    public LinkedAccountService(
        UserRepository userRepository,
        OAuthAccountRepository oauthAccountRepository,
        AuthEphemeralStore ephemeralStore
    ) {
        this.userRepository = userRepository;
        this.oauthAccountRepository = oauthAccountRepository;
        this.ephemeralStore = ephemeralStore;
    }

    @Transactional(readOnly = true)
    public List<LinkedAccountDto> listLinkedAccounts(UUID userId) {
        return oauthAccountRepository.findByUserIdOrderByCreatedAtAsc(userId).stream()
            .map(LinkedAccountDto::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public OAuthLinkStartResponse createLinkStart(UUID userId, String rawProvider) {
        String provider = normalizeProvider(rawProvider);
        if (!userRepository.existsById(userId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found.");
        }
        if (oauthAccountRepository.findByUserIdAndProvider(userId, provider).isPresent()) {
            throw new ApiException(
                HttpStatus.CONFLICT,
                "PROVIDER_ALREADY_LINKED",
                "This provider is already connected to your account."
            );
        }
        String token = ephemeralStore.createOAuthLinkToken(userId, provider);
        return new OAuthLinkStartResponse("/api/v1/auth/oauth/link/" + provider + "?token=" + token);
    }

    @Transactional
    public void disconnectAccount(UUID userId, UUID accountId) {
        OAuthAccountEntity account = oauthAccountRepository.findByIdAndUserId(accountId, userId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "LINKED_ACCOUNT_NOT_FOUND", "Linked account not found."));

        UserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found."));

        boolean hasPassword = user.getPasswordHash() != null && !user.getPasswordHash().isBlank();
        long linkedCount = oauthAccountRepository.countByUserId(userId);
        if (!hasPassword && linkedCount <= 1) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "LAST_SIGN_IN_METHOD",
                "Set a password or link another account before disconnecting your last sign-in method."
            );
        }

        oauthAccountRepository.delete(account);
    }

    public static String normalizeProvider(String rawProvider) {
        if (rawProvider == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "UNSUPPORTED_PROVIDER", "Unsupported OAuth provider.");
        }
        String normalized = rawProvider.trim().toLowerCase(Locale.ROOT);
        if (!SUPPORTED_PROVIDERS.contains(normalized)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "UNSUPPORTED_PROVIDER", "Unsupported OAuth provider.");
        }
        return normalized;
    }
}
