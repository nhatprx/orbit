package com.orbit.auth.controller;

import com.orbit.auth.dto.AccountSecurityDto;
import com.orbit.auth.dto.AuthUserDto;
import com.orbit.auth.dto.ChangePasswordRequest;
import com.orbit.auth.dto.DisableTwoFactorRequest;
import com.orbit.auth.dto.PasswordResetResponse;
import com.orbit.auth.dto.TwoFactorEnableResponse;
import com.orbit.auth.dto.TwoFactorSetupResponse;
import com.orbit.auth.dto.UpdateAccountProfileRequest;
import com.orbit.auth.dto.VerifyTotpRequest;
import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.auth.service.AccountProfileService;
import com.orbit.auth.service.AccountSecurityService;
import com.orbit.common.ApiException;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/account")
public class AccountSecurityController {

    private final AccountSecurityService accountSecurityService;
    private final AccountProfileService accountProfileService;

    public AccountSecurityController(
        AccountSecurityService accountSecurityService,
        AccountProfileService accountProfileService
    ) {
        this.accountSecurityService = accountSecurityService;
        this.accountProfileService = accountProfileService;
    }

    @GetMapping("/security")
    public ResponseEntity<AccountSecurityDto> getSecurityStatus(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        return ResponseEntity.ok(accountSecurityService.getSecurityStatus(requireUser(principal)));
    }

    @PatchMapping("/profile")
    public ResponseEntity<AuthUserDto> updateProfile(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody UpdateAccountProfileRequest request
    ) {
        return ResponseEntity.ok(accountProfileService.updateProfile(requireUser(principal), request));
    }

    @PostMapping("/password")
    public ResponseEntity<PasswordResetResponse> changePassword(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody ChangePasswordRequest request
    ) {
        accountSecurityService.changePassword(requireUser(principal), request);
        return ResponseEntity.ok(new PasswordResetResponse("Password updated successfully."));
    }

    @PostMapping("/2fa/setup")
    public ResponseEntity<TwoFactorSetupResponse> beginTwoFactorSetup(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        return ResponseEntity.ok(accountSecurityService.beginTwoFactorSetup(requireUser(principal)));
    }

    @PostMapping("/2fa/enable")
    public ResponseEntity<TwoFactorEnableResponse> enableTwoFactor(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody VerifyTotpRequest request
    ) {
        return ResponseEntity.ok(accountSecurityService.enableTwoFactor(requireUser(principal), request.code()));
    }

    @PostMapping("/2fa/disable")
    public ResponseEntity<PasswordResetResponse> disableTwoFactor(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody DisableTwoFactorRequest request
    ) {
        accountSecurityService.disableTwoFactor(requireUser(principal), request);
        return ResponseEntity.ok(new PasswordResetResponse("Two-factor authentication has been disabled."));
    }

    @PostMapping("/2fa/backup-codes/regenerate")
    public ResponseEntity<TwoFactorEnableResponse> regenerateBackupCodes(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody VerifyTotpRequest request
    ) {
        List<String> codes = accountSecurityService.regenerateBackupCodes(requireUser(principal), request.code());
        return ResponseEntity.ok(new TwoFactorEnableResponse(true, codes));
    }

    private UUID requireUser(AuthenticatedUserPrincipal principal) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required.");
        }
        return principal.userId();
    }
}
