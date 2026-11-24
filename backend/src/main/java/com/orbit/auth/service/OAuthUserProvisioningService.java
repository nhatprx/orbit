package com.orbit.auth.service;

import com.orbit.auth.entity.OAuthAccountEntity;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.OAuthAccountRepository;
import com.orbit.auth.repository.UserRepository;
import com.orbit.auth.validation.UsernameNormalizer;
import com.orbit.common.ApiException;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OAuthUserProvisioningService {

    private final UserRepository userRepository;
    private final OAuthAccountRepository oauthAccountRepository;

    public OAuthUserProvisioningService(
        UserRepository userRepository,
        OAuthAccountRepository oauthAccountRepository
    ) {
        this.userRepository = userRepository;
        this.oauthAccountRepository = oauthAccountRepository;
    }

    @Transactional
    public UserEntity provisionOAuthUser(String provider, OAuth2User oauth2User) {
        String normalizedProvider = provider.toLowerCase(Locale.ROOT);
        Map<String, Object> attrs = oauth2User.getAttributes();

        String providerUserId = extractProviderUserId(normalizedProvider, attrs);
        String email = extractEmail(normalizedProvider, providerUserId, attrs);
        String displayName = extractDisplayName(attrs, email);
        String candidateUsername = extractUsernameCandidate(normalizedProvider, attrs, email);
        String providerUsername = extractProviderUsername(normalizedProvider, attrs);

        Optional<OAuthAccountEntity> existingOAuth = oauthAccountRepository
            .findByProviderAndProviderUserId(normalizedProvider, providerUserId);

        if (existingOAuth.isPresent()) {
            OAuthAccountEntity account = existingOAuth.get();
            boolean changed = false;
            if (account.getProviderDisplayName() == null || account.getProviderDisplayName().isBlank()) {
                account.setProviderDisplayName(displayName);
                changed = true;
            }
            if (providerUsername != null && !providerUsername.equals(account.getProviderUsername())) {
                account.setProviderUsername(providerUsername);
                changed = true;
            }
            if (changed) oauthAccountRepository.save(account);
            return account.getUser();
        }

        UserEntity user = userRepository.findByEmailIgnoreCase(email)
            .orElseGet(() -> createNewOAuthUser(email, displayName, candidateUsername));

        saveOAuthLink(user, normalizedProvider, providerUserId, email, displayName, providerUsername);
        return user;
    }

    @Transactional
    public OAuthAccountEntity linkOAuthAccount(UUID userId, String provider, OAuth2User oauth2User) {
        String normalizedProvider = provider.toLowerCase(Locale.ROOT);
        UserEntity user = userRepository.findById(userId).orElseThrow(() ->
            new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found.")
        );

        Map<String, Object> attrs = oauth2User.getAttributes();
        String providerUserId = extractProviderUserId(normalizedProvider, attrs);
        String email = extractEmail(normalizedProvider, providerUserId, attrs);
        String displayName = extractDisplayName(attrs, email);
        String providerUsername = extractProviderUsername(normalizedProvider, attrs);

        Optional<OAuthAccountEntity> existingByProviderId = oauthAccountRepository
            .findByProviderAndProviderUserId(normalizedProvider, providerUserId);
        if (existingByProviderId.isPresent()) {
            OAuthAccountEntity existing = existingByProviderId.get();
            if (!existing.getUser().getId().equals(userId)) {
                throw new ApiException(
                    HttpStatus.CONFLICT,
                    "OAUTH_ACCOUNT_ALREADY_LINKED",
                    "This " + normalizedProvider + " account is already linked to another Orbit account."
                );
            }
            existing.setProviderEmail(email);
            existing.setProviderDisplayName(displayName);
            if (providerUsername != null) existing.setProviderUsername(providerUsername);
            return oauthAccountRepository.save(existing);
        }

        if (oauthAccountRepository.findByUserIdAndProvider(userId, normalizedProvider).isPresent()) {
            throw new ApiException(
                HttpStatus.CONFLICT,
                "PROVIDER_ALREADY_LINKED",
                "A " + normalizedProvider + " account is already connected to your Orbit account."
            );
        }

        return saveOAuthLink(user, normalizedProvider, providerUserId, email, displayName, providerUsername);
    }

    private OAuthAccountEntity saveOAuthLink(
        UserEntity user,
        String provider,
        String providerUserId,
        String email,
        String displayName,
        String providerUsername
    ) {
        OAuthAccountEntity account = new OAuthAccountEntity();
        account.setUser(user);
        account.setProvider(provider);
        account.setProviderUserId(providerUserId);
        account.setProviderEmail(email);
        account.setProviderDisplayName(displayName);
        account.setProviderUsername(providerUsername);
        return oauthAccountRepository.save(account);
    }

    private String extractProviderUsername(String provider, Map<String, Object> attrs) {
        if (!"github".equals(provider)) return null;
        Object login = attrs.get("login");
        return (login != null && !login.toString().isBlank()) ? login.toString().trim() : null;
    }

    private UserEntity createNewOAuthUser(String email, String displayName, String candidateUsername) {
        String uniqueUsername = allocateUniqueUsername(candidateUsername);
        UserEntity user = new UserEntity();
        user.setUsername(uniqueUsername);
        user.setEmail(email);
        user.setDisplayName(displayName);
        user.setRole("user");
        user.setWorkspaceId("ws_orbit_core");
        return userRepository.save(user);
    }

    private String allocateUniqueUsername(String rawCandidate) {
        String base = UsernameNormalizer.sanitizeCandidate(rawCandidate, "orbit_");
        if (!userRepository.existsByUsernameIgnoreCase(base)) {
            return base;
        }
        for (int i = 0; i < 10; i++) {
            int suffix = ThreadLocalRandom.current().nextInt(1000, 9999);
            String attempt = base + "_" + suffix;
            if (!userRepository.existsByUsernameIgnoreCase(attempt)) {
                return attempt;
            }
        }
        return base + "_" + System.currentTimeMillis() % 100000;
    }

    private String extractProviderUserId(String provider, Map<String, Object> attrs) {
        Object id = "google".equals(provider) ? attrs.get("sub") : attrs.get("id");
        if (id == null) id = attrs.get("sub");
        return String.valueOf(id);
    }

    private String extractEmail(String provider, String providerUserId, Map<String, Object> attrs) {
        Object rawEmail = attrs.get("email");
        if (rawEmail != null && !rawEmail.toString().isBlank()) {
            return rawEmail.toString().trim().toLowerCase(Locale.ROOT);
        }
        Object login = attrs.get("login");
        String prefix = login != null ? login.toString() : provider + "_" + providerUserId;
        return (prefix + "@users.noreply." + provider + ".orbit.dev").toLowerCase(Locale.ROOT);
    }

    private String extractDisplayName(Map<String, Object> attrs, String email) {
        Object name = attrs.get("name");
        if (name != null && !name.toString().isBlank()) return name.toString().trim();
        Object login = attrs.get("login");
        if (login != null && !login.toString().isBlank()) return login.toString().trim();
        return email.split("@")[0];
    }

    private String extractUsernameCandidate(String provider, Map<String, Object> attrs, String email) {
        if ("github".equals(provider) && attrs.get("login") != null) {
            return attrs.get("login").toString();
        }
        return email.split("@")[0];
    }
}
