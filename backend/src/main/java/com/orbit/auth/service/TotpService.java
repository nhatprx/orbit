package com.orbit.auth.service;

import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/** RFC 6238 TOTP generator/verifier (HMAC-SHA1, 6 digits, 30-second window) and backup codes. */
@Service
public class TotpService {

    private static final String BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final String BACKUP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int SECRET_BYTES = 20;
    private static final int CODE_DIGITS = 6;
    private static final int MODULO = 1_000_000;
    private static final long PERIOD_SECONDS = 30L;
    private static final int ALLOWED_SKEW_STEPS = 1;
    private static final String ISSUER = "Orbit";

    private final SecureRandom secureRandom = new SecureRandom();
    private final Clock clock;

    @Autowired
    public TotpService() {
        this(Clock.systemUTC());
    }

    TotpService(Clock clock) {
        this.clock = clock;
    }

    public String generateSecret() {
        byte[] bytes = new byte[SECRET_BYTES];
        secureRandom.nextBytes(bytes);
        return encodeBase32(bytes);
    }

    public String buildOtpAuthUri(String accountLabel, String secret) {
        String label = URLEncoder.encode(ISSUER + ":" + accountLabel, StandardCharsets.UTF_8);
        String issuer = URLEncoder.encode(ISSUER, StandardCharsets.UTF_8);
        return "otpauth://totp/" + label + "?secret=" + secret + "&issuer=" + issuer
            + "&algorithm=SHA1&digits=" + CODE_DIGITS + "&period=" + PERIOD_SECONDS;
    }

    public boolean verifyCode(String base32Secret, String rawCode) {
        if (base32Secret == null || base32Secret.isBlank() || rawCode == null) {
            return false;
        }
        String digits = rawCode.replaceAll("[\\s-]", "");
        if (!digits.matches("\\d{6}")) {
            return false;
        }
        byte[] key = decodeBase32(base32Secret);
        if (key.length == 0) {
            return false;
        }
        long currentStep = Math.floorDiv(clock.instant().getEpochSecond(), PERIOD_SECONDS);
        for (int offset = -ALLOWED_SKEW_STEPS; offset <= ALLOWED_SKEW_STEPS; offset++) {
            String expected = generateCodeForStep(key, currentStep + offset);
            if (constantTimeEquals(expected, digits)) {
                return true;
            }
        }
        return false;
    }

    public String generateCurrentCode(String base32Secret) {
        byte[] key = decodeBase32(base32Secret);
        long currentStep = Math.floorDiv(clock.instant().getEpochSecond(), PERIOD_SECONDS);
        return generateCodeForStep(key, currentStep);
    }

    public List<String> generateBackupCodes(int count) {
        List<String> codes = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            StringBuilder sb = new StringBuilder(9);
            for (int c = 0; c < 8; c++) {
                if (c == 4) sb.append('-');
                sb.append(BACKUP_ALPHABET.charAt(secureRandom.nextInt(BACKUP_ALPHABET.length())));
            }
            codes.add(sb.toString());
        }
        return codes;
    }

    private String generateCodeForStep(byte[] key, long step) {
        try {
            byte[] counter = ByteBuffer.allocate(8).putLong(step).array();
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(counter);
            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24)
                | ((hash[offset + 1] & 0xFF) << 16)
                | ((hash[offset + 2] & 0xFF) << 8)
                | (hash[offset + 3] & 0xFF);
            return String.format(Locale.ROOT, "%06d", binary % MODULO);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Failed to compute TOTP code.", ex);
        }
    }

    private static String encodeBase32(byte[] data) {
        StringBuilder out = new StringBuilder((data.length * 8 + 4) / 5);
        int buffer = 0;
        int bitsLeft = 0;
        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xFF);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                int index = (buffer >> (bitsLeft - 5)) & 0x1F;
                bitsLeft -= 5;
                out.append(BASE32_ALPHABET.charAt(index));
            }
        }
        if (bitsLeft > 0) {
            int index = (buffer << (5 - bitsLeft)) & 0x1F;
            out.append(BASE32_ALPHABET.charAt(index));
        }
        return out.toString();
    }

    private static byte[] decodeBase32(String input) {
        String normalized = input.replaceAll("[\\s=-]", "").toUpperCase(Locale.ROOT);
        byte[] out = new byte[(normalized.length() * 5) / 8];
        int buffer = 0;
        int bitsLeft = 0;
        int count = 0;
        for (int i = 0; i < normalized.length(); i++) {
            int val = BASE32_ALPHABET.indexOf(normalized.charAt(i));
            if (val < 0) return new byte[0];
            buffer = (buffer << 5) | val;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                out[count++] = (byte) ((buffer >> (bitsLeft - 8)) & 0xFF);
                bitsLeft -= 8;
            }
        }
        return out;
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) return false;
        int diff = 0;
        for (int i = 0; i < a.length(); i++) {
            diff |= a.charAt(i) ^ b.charAt(i);
        }
        return diff == 0;
    }
}
