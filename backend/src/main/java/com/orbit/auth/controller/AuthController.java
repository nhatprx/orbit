package com.orbit.auth.controller;

import com.orbit.auth.dto.AuthSessionResponse;
import com.orbit.auth.dto.AuthUserDto;
import com.orbit.auth.dto.LoginRequest;
import com.orbit.auth.dto.MfaLoginRequest;
import com.orbit.auth.dto.OAuthExchangeRequest;
import com.orbit.auth.dto.RegisterRequest;
import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.auth.service.AuthService;
import com.orbit.common.ApiException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthSessionResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthSessionResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/login/2fa")
    public ResponseEntity<AuthSessionResponse> completeMfaLogin(@Valid @RequestBody MfaLoginRequest request) {
        return ResponseEntity.ok(authService.completeMfaLogin(request));
    }

    @PostMapping("/oauth/exchange")
    public ResponseEntity<AuthSessionResponse> exchangeOAuthCode(
        @Valid @RequestBody OAuthExchangeRequest request
    ) {
        return ResponseEntity.ok(authService.exchangeOAuthCode(request.code()));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthUserDto> getCurrentUser(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required.");
        }
        return ResponseEntity.ok(authService.getCurrentUser(principal.userId()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        if (principal != null) {
            authService.logout(principal.jti());
        }
        return ResponseEntity.noContent().build();
    }
}
