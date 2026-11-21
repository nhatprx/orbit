package com.orbit.git.service;

import com.orbit.git.config.GitProperties;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

/** Encrypts and decrypts GitHub access tokens at rest using AES-256-GCM. */
@Component
public class GitTokenCrypto {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int IV_LENGTH_BYTES = 12;
    private static final int TAG_LENGTH_BITS = 128;

    private final GitProperties properties;
    private final SecureRandom secureRandom = new SecureRandom();

    public GitTokenCrypto(GitProperties properties) {
        this.properties = properties;
    }

    public String encrypt(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new IllegalArgumentException("Access token must not be blank.");
        }
        try {
            byte[] iv = new byte[IV_LENGTH_BYTES];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, deriveKey(), new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] encrypted = cipher.doFinal(rawToken.trim().getBytes(StandardCharsets.UTF_8));
            ByteBuffer buffer = ByteBuffer.allocate(iv.length + encrypted.length);
            buffer.put(iv);
            buffer.put(encrypted);
            return Base64.getEncoder().encodeToString(buffer.array());
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Failed to encrypt Git access token.", ex);
        }
    }

    public String decrypt(String encryptedToken) {
        if (encryptedToken == null || encryptedToken.isBlank()) {
            throw new IllegalArgumentException("Encrypted token must not be blank.");
        }
        try {
            byte[] combined = Base64.getDecoder().decode(encryptedToken);
            if (combined.length <= IV_LENGTH_BYTES) {
                throw new IllegalArgumentException("Encrypted token payload is invalid.");
            }
            byte[] iv = new byte[IV_LENGTH_BYTES];
            byte[] ciphertext = new byte[combined.length - IV_LENGTH_BYTES];
            System.arraycopy(combined, 0, iv, 0, IV_LENGTH_BYTES);
            System.arraycopy(combined, IV_LENGTH_BYTES, ciphertext, 0, ciphertext.length);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, deriveKey(), new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] plain = cipher.doFinal(ciphertext);
            return new String(plain, StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            throw new IllegalStateException("Failed to decrypt Git access token.", ex);
        }
    }

    public String maskToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return "";
        }
        String trimmed = rawToken.trim();
        if (trimmed.length() <= 8) {
            return "****";
        }
        int underscore = trimmed.indexOf('_');
        String prefix = (underscore > 0 && underscore < 12)
            ? trimmed.substring(0, underscore + 1)
            : trimmed.substring(0, 4);
        String suffix = trimmed.substring(trimmed.length() - 4);
        return prefix + "..." + suffix;
    }

    private SecretKey deriveKey() throws GeneralSecurityException {
        String secret = properties.getEncryptionSecret();
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("Git encryption secret is not configured.");
        }
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] keyBytes = digest.digest(secret.getBytes(StandardCharsets.UTF_8));
        return new SecretKeySpec(keyBytes, "AES");
    }
}
