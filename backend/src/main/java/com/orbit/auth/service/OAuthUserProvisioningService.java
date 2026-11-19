package com.orbit.auth.service;

import com.orbit.auth.entity.OAuthAccountEntity;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.OAuthAccountRepository;
import com.orbit.auth.repository.UserRepository;
import com.orbit.auth.validation.UsernameNormalizer;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
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

        Optional<OAuthAccountEntity> existingOAuth = oauthAccountRepository
            .findByProviderAndProviderUserId(normalizedProvider, providerUserId);

        if (existingOAuth.isPresent()) {
            return existingOAuth.get().getUser();
        }

        UserEntity user = userRepository.findByEmailIgnoreCase(email)
            .orElseGet(() -> createNewOAuthUser(email, displayName, candidateUsername));

        OAuthAccountEntity account = new OAuthAccountEntity();
        account.setUser(user);
        account.setProvider(normalizedProvider);
        account.setProviderUserId(providerUserId);
        account.setProviderEmail(email);
        oauthAccountRepository.save(account);

        return user;
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
