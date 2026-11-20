package com.orbit.auth.service;

import com.orbit.auth.dto.AccountSecurityDto;
import com.orbit.auth.dto.ChangePasswordRequest;
import com.orbit.auth.dto.DisableTwoFactorRequest;
import com.orbit.auth.dto.TwoFactorEnableResponse;
import com.orbit.auth.dto.TwoFactorSetupResponse;
import com.orbit.auth.entity.OAuthAccountEntity;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.OAuthAccountRepository;
import com.orbit.auth.repository.UserRepository;
import com.orbit.auth.service.BackupCodeCodec.ConsumeResult;
import com.orbit.auth.validation.PasswordPolicyValidator;
import com.orbit.common.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountSecurityService {

    private static final int BACKUP_CODE_COUNT = 8;

    private final UserRepository userRepository;
    private final OAuthAccountRepository oauthAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final TotpService totpService;

    public AccountSecurityService(
        UserRepository userRepository,
        OAuthAccountRepository oauthAccountRepository,
        PasswordEncoder passwordEncoder,
        TotpService totpService
    ) {
        this.userRepository = userRepository;
        this.oauthAccountRepository = oauthAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.totpService = totpService;
    }

    @Transactional(readOnly = true)
    public AccountSecurityDto getSecurityStatus(UUID userId) {
        UserEntity user = loadUser(userId);
        List<String> providers = oauthAccountRepository.findByUserIdOrderByCreatedAtAsc(userId).stream()
            .map(OAuthAccountEntity::getProvider)
            .toList();
        return new AccountSecurityDto(
            user.getEmail(),
            user.getUsername(),
            hasPassword(user),
            user.isTotpEnabled(),
            BackupCodeCodec.parseHashes(user.getTotpBackupCodes()).size(),
            providers
        );
    }

    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request) {
        UserEntity user = loadUser(userId);
        PasswordPolicyValidator.validate(request.newPassword());

        if (hasPassword(user)) {
            if (request.currentPassword() == null || request.currentPassword().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "CURRENT_PASSWORD_REQUIRED", "Current password is required.");
            }
            if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CURRENT_PASSWORD", "Current password is incorrect.");
            }
            if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "SAME_PASSWORD", "New password must be different from current password.");
            }
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    @Transactional
    public TwoFactorSetupResponse beginTwoFactorSetup(UUID userId, String password) {
        UserEntity user = loadUser(userId);
        if (user.isTotpEnabled()) {
            throw new ApiException(HttpStatus.CONFLICT, "TWO_FACTOR_ALREADY_ENABLED", "Two-factor authentication is already enabled.");
        }
        requireValidPasswordFor2FA(user, password);
        String secret = totpService.generateSecret();
        user.setTotpPendingSecret(secret);
        userRepository.save(user);
        return new TwoFactorSetupResponse(secret, totpService.buildOtpAuthUri(user.getUsername(), secret));
    }

    @Transactional
    public TwoFactorEnableResponse enableTwoFactor(UUID userId, String password, String code) {
        UserEntity user = loadUser(userId);
        if (user.isTotpEnabled()) {
            throw new ApiException(HttpStatus.CONFLICT, "TWO_FACTOR_ALREADY_ENABLED", "Two-factor authentication is already enabled.");
        }
        requireValidPasswordFor2FA(user, password);
        if (user.getTotpPendingSecret() == null || user.getTotpPendingSecret().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "TWO_FACTOR_SETUP_NOT_STARTED", "Start 2FA setup before verifying.");
        }
        if (!totpService.verifyCode(user.getTotpPendingSecret(), code)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TOTP_CODE", "Invalid authenticator code.");
        }
        List<String> backupCodes = totpService.generateBackupCodes(BACKUP_CODE_COUNT);
        user.setTotpSecret(user.getTotpPendingSecret());
        user.setTotpPendingSecret(null);
        user.setTotpEnabled(true);
        user.setTotpBackupCodes(BackupCodeCodec.encodeAll(backupCodes, passwordEncoder));
        userRepository.save(user);
        return new TwoFactorEnableResponse(true, backupCodes);
    }

    @Transactional
    public void disableTwoFactor(UUID userId, DisableTwoFactorRequest request) {
        UserEntity user = loadUser(userId);
        if (!user.isTotpEnabled()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "TWO_FACTOR_NOT_ENABLED", "Two-factor authentication is not enabled.");
        }
        if (hasPassword(user) && (request.password() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash()))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CURRENT_PASSWORD", "Password is incorrect.");
        }
        if (!verifySecondFactor(user, request.code())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TOTP_CODE", "Invalid verification or backup code.");
        }
        user.setTotpEnabled(false);
        user.setTotpSecret(null);
        user.setTotpPendingSecret(null);
        user.setTotpBackupCodes(null);
        userRepository.save(user);
    }

    @Transactional
    public List<String> regenerateBackupCodes(UUID userId, String code) {
        UserEntity user = loadUser(userId);
        if (!user.isTotpEnabled()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "TWO_FACTOR_NOT_ENABLED", "Two-factor authentication is not enabled.");
        }
        if (!totpService.verifyCode(user.getTotpSecret(), code)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TOTP_CODE", "Invalid authenticator code.");
        }
        List<String> backupCodes = totpService.generateBackupCodes(BACKUP_CODE_COUNT);
        user.setTotpBackupCodes(BackupCodeCodec.encodeAll(backupCodes, passwordEncoder));
        userRepository.save(user);
        return backupCodes;
    }

    @Transactional
    public boolean verifySecondFactor(UserEntity user, String rawCode) {
        if (rawCode == null || rawCode.isBlank()) return false;
        if (totpService.verifyCode(user.getTotpSecret(), rawCode)) return true;
        ConsumeResult res = BackupCodeCodec.consumeMatch(user.getTotpBackupCodes(), rawCode, passwordEncoder);
        if (res.matched()) {
            user.setTotpBackupCodes(res.remainingEncoded());
            userRepository.save(user);
            return true;
        }
        return false;
    }

    private void requireValidPasswordFor2FA(UserEntity user, String password) {
        if (!hasPassword(user)) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "PASSWORD_REQUIRED_FOR_2FA",
                "Set an account password before enabling two-factor authentication."
            );
        }
        if (password == null || password.isBlank() || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CURRENT_PASSWORD", "Password is incorrect.");
        }
    }

    private UserEntity loadUser(UUID userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found."));
    }

    private boolean hasPassword(UserEntity user) {
        return user.getPasswordHash() != null && !user.getPasswordHash().isBlank();
    }
}
