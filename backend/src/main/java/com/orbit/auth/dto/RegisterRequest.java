package com.orbit.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank(message = "Email is required.")
    @Email(message = "Email format is invalid.")
    String email,

    @NotBlank(message = "Password is required.")
    String password,

    @NotBlank(message = "Username is required.")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters.")
    String username,

    @NotBlank(message = "Country is required.")
    String country,

    boolean emailPreference
) {}
