package com.orbit.auth.controller;

import com.orbit.auth.dto.ForgotPasswordRequest;
import com.orbit.auth.dto.PasswordResetResponse;
import com.orbit.auth.dto.ResetPasswordRequest;
import com.orbit.auth.service.PasswordResetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Authentication and account recovery endpoints")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    public PasswordResetController(PasswordResetService passwordResetService) {
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/forgot-password")
    @Operation(
        summary = "Request a password reset token",
        description = "Always returns 200 OK with a generic message to prevent email enumeration."
    )
    public ResponseEntity<PasswordResetResponse> forgotPassword(
        @Valid @RequestBody ForgotPasswordRequest request
    ) {
        String message = passwordResetService.forgotPassword(request.email());
        return ResponseEntity.ok(new PasswordResetResponse(message));
    }

    @PostMapping("/reset-password")
    @Operation(
        summary = "Reset password with a single-use token",
        description = "Validates token and password policy, updates BCrypt password hash, and invalidates token."
    )
    public ResponseEntity<PasswordResetResponse> resetPassword(
        @Valid @RequestBody ResetPasswordRequest request
    ) {
        String message = passwordResetService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.ok(new PasswordResetResponse(message));
    }
}
