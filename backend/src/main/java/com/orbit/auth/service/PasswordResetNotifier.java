package com.orbit.auth.service;

public interface PasswordResetNotifier {

    void sendResetToken(String email, String token, long ttlSeconds);
}
