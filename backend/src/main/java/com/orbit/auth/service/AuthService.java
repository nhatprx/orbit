package com.orbit.auth.service;

import com.orbit.auth.dto.AuthSessionResponse;
import com.orbit.auth.dto.AuthUserDto;
import com.orbit.auth.dto.LoginRequest;
import com.orbit.auth.dto.RegisterRequest;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.auth.service.JwtService.IssuedToken;
import com.orbit.auth.validation.PasswordPolicyValidator;
import com.orbit.auth.validation.UsernameNormalizer;
import com.orbit.common.ApiException;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
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

    public AuthService(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        JwtService jwtService,
        RedisSessionService redisSessionService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.redisSessionService = redisSessionService;
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
            throw new ApiException(
                HttpStatus.UNAUTHORIZED,
                "INVALID_CREDENTIALS",
                "Invalid username/email or password."
            );
        }

        return createSession(user);
    }

    @Transactional(readOnly = true)
    public AuthSessionResponse exchangeOAuthCode(String code) {
        UUID userId = redisSessionService.consumeOAuthExchangeCode(code).orElseThrow(() ->
            new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_OAUTH_CODE", "OAuth code is invalid or expired.")
        );
        UserEntity user = userRepository.findById(userId).orElseThrow(() ->
            new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Authenticated user not found.")
        );
        return createSession(user);
    }

    @Transactional(readOnly = true)
    public AuthUserDto getCurrentUser(UUID userId) {
        UserEntity user = userRepository.findById(userId).orElseThrow(() ->
            new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found.")
        );
        return AuthUserDto.from(user);
    }

    public void logout(String jti) {
        redisSessionService.revokeSession(jti);
    }

    public AuthSessionResponse createSession(UserEntity user) {
        IssuedToken issued = jwtService.issueToken(user);
        redisSessionService.storeActiveSession(issued.jti(), user.getId(), jwtService.getExpirationSeconds());
        return new AuthSessionResponse(AuthUserDto.from(user), issued.token(), issued.expiresAt());
    }
}
