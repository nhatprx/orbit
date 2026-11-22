package com.orbit.auth.service;

import com.orbit.auth.dto.AuthSessionResponse;
import com.orbit.auth.dto.AuthUserDto;
import com.orbit.auth.dto.LoginRequest;
import com.orbit.auth.dto.MfaLoginRequest;
import com.orbit.auth.dto.RegisterRequest;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.auth.service.AuthEphemeralStore.MfaChallenge;
import com.orbit.auth.service.JwtService.IssuedToken;
import com.orbit.auth.validation.PasswordPolicyValidator;
import com.orbit.auth.validation.UsernameNormalizer;
import com.orbit.common.ApiException;
import com.orbit.storage.service.StorageService;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RedisSessionService redisSessionService;
    private final AuthEphemeralStore ephemeralStore;
    private final AccountSecurityService accountSecurityService;
    private final StorageService storageService;

    @Autowired
    public AuthService(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        JwtService jwtService,
        RedisSessionService redisSessionService,
        AuthEphemeralStore ephemeralStore,
        AccountSecurityService accountSecurityService,
        StorageService storageService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.redisSessionService = redisSessionService;
        this.ephemeralStore = ephemeralStore;
        this.accountSecurityService = accountSecurityService;
        this.storageService = storageService;
    }

    AuthService(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        JwtService jwtService,
        RedisSessionService redisSessionService
    ) {
        this(userRepository, passwordEncoder, jwtService, redisSessionService, null, null, null);
    }

    @Transactional
    public AuthSessionResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String username = UsernameNormalizer.normalizeStrict(request.username());
        PasswordPolicyValidator.validate(request.password());

        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new ApiException(HttpStatus.CONFLICT, "USERNAME_TAKEN", "Username is already taken.");
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "Email is already registered.");
        }

        UserEntity user = new UserEntity();
        user.setUsername(username);
        user.setEmail(email);
        user.setDisplayName(username);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setCountry(request.country().trim());
        user.setEmailPreference(request.emailPreference());
        user.setRole("user");
        user.setWorkspaceId("ws_orbit_core");

        UserEntity saved = userRepository.save(user);
        return createSession(saved);
    }

    @Transactional(readOnly = true)
    public AuthSessionResponse login(LoginRequest request) {
        String identifier = request.identifier().trim().toLowerCase(Locale.ROOT);
        Optional<UserEntity> found = identifier.contains("@")
            ? userRepository.findByEmailIgnoreCase(identifier)
            : userRepository.findByUsernameIgnoreCase(identifier);

        if (found.isEmpty() && !identifier.contains("@")) {
            found = userRepository.findByEmailIgnoreCase(identifier);
        }

        UserEntity user = found.orElseThrow(() ->
            new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid username/email or password.")
        );

        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid username/email or password.");
        }

        return issueSessionOrMfa(user, request.isRememberMe());
    }

    @Transactional(readOnly = true)
    public AuthSessionResponse exchangeOAuthCode(String code) {
        if (code == null || code.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_OAUTH_CODE", "OAuth code is invalid or expired.");
        }
        UUID userId = redisSessionService.consumeOAuthExchangeCode(code).orElseThrow(() ->
            new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_OAUTH_CODE", "OAuth code is invalid or expired.")
        );
        UserEntity user = userRepository.findById(userId).orElseThrow(() ->
            new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Authenticated user not found.")
        );
        return issueSessionOrMfa(user, false);
    }

    @Transactional
    public AuthSessionResponse completeMfaLogin(MfaLoginRequest request) {
        if (ephemeralStore == null || accountSecurityService == null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "MFA_UNAVAILABLE", "Two-factor verification unavailable.");
        }
        MfaChallenge challenge = ephemeralStore.peekMfaChallenge(request.mfaToken()).orElseThrow(() ->
            new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_MFA_TOKEN", "Verification session expired. Sign in again.")
        );
        UserEntity user = userRepository.findById(challenge.userId()).orElseThrow(() ->
            new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found.")
        );
        AccountStatusGuard.requireActive(user);
        if (!accountSecurityService.verifySecondFactor(user, request.code())) {
            boolean locked = ephemeralStore.recordMfaFailure(request.mfaToken());
            String msg = locked
                ? "Too many invalid codes. Please sign in again."
                : "Invalid authentication code.";
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_TOTP_CODE", msg);
        }
        ephemeralStore.consumeMfaChallenge(request.mfaToken());
        return createSession(user, challenge.rememberMe());
    }

    @Transactional(readOnly = true)
    public AuthUserDto getCurrentUser(UUID userId) {
        UserEntity user = userRepository.findById(userId).orElseThrow(() ->
            new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found.")
        );
        return toUserDto(user);
    }

    public void logout(String jti) {
        redisSessionService.revokeSession(jti);
    }

    public AuthSessionResponse createSession(UserEntity user) {
        return createSession(user, false);
    }

    public AuthSessionResponse createSession(UserEntity user, boolean rememberMe) {
        long ttlSeconds = jwtService.resolveExpirationSeconds(rememberMe);
        IssuedToken issued = jwtService.issueToken(user, ttlSeconds);
        redisSessionService.storeActiveSession(issued.jti(), user.getId(), ttlSeconds);
        return new AuthSessionResponse(toUserDto(user), issued.token(), issued.expiresAt(), issued.expiresInSeconds());
    }

    private AuthUserDto toUserDto(UserEntity user) {
        String avatarUrl = storageService == null ? null : storageService.resolveObjectUrl(user.getAvatarKey());
        return AuthUserDto.from(user, avatarUrl);
    }

    private AuthSessionResponse issueSessionOrMfa(UserEntity user, boolean rememberMe) {
        AccountStatusGuard.requireActive(user);
        if (user.isTotpEnabled() && ephemeralStore != null) {
            String mfaToken = ephemeralStore.createMfaChallenge(user.getId(), rememberMe);
            return AuthSessionResponse.mfaChallenge(mfaToken);
        }
        return createSession(user, rememberMe);
    }
}
