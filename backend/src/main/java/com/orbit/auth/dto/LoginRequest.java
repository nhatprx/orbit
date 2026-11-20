package com.orbit.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
    @NotBlank(message = "Username or email is required.")
    String identifier,

    @NotBlank(message = "Password is required.")
    String password,

    Boolean rememberMe
) {

    public LoginRequest(String identifier, String password) {
        this(identifier, password, false);
    }

    public boolean isRememberMe() {
        return Boolean.TRUE.equals(rememberMe);
    }
}
