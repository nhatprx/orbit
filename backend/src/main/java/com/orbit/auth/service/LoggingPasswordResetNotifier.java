package com.orbit.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class LoggingPasswordResetNotifier implements PasswordResetNotifier {

    private static final Logger log = LoggerFactory.getLogger(LoggingPasswordResetNotifier.class);

    @Override
    public void sendResetToken(String email, String token, long ttlSeconds) {
        log.info(
            "Password reset dispatched recipient={} tokenRef={} ttlSeconds={}",
            maskEmail(email),
            maskToken(token),
            ttlSeconds
        );
    }

    static String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "***";
        }
        int atIndex = email.indexOf('@');
        String local = email.substring(0, atIndex);
        String domain = email.substring(atIndex);
        if (local.isEmpty()) {
            return "***" + domain;
        }
        return local.charAt(0) + "***" + domain;
    }

    static String maskToken(String token) {
        if (token == null || token.length() < 6) {
            return "****";
        }
        return "****" + token.substring(token.length() - 4);
    }
}
