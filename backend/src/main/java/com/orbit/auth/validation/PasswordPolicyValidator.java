package com.orbit.auth.validation;

import com.orbit.common.ApiException;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;

public final class PasswordPolicyValidator {

    private static final int MIN_LENGTH = 8;
    private static final Pattern UPPERCASE = Pattern.compile("[A-Z]");
    private static final Pattern LOWERCASE = Pattern.compile("[a-z]");
    private static final Pattern DIGIT = Pattern.compile("[0-9]");
    private static final Pattern SPECIAL = Pattern.compile("[^A-Za-z0-9\\s]");

    private PasswordPolicyValidator() {}

    public static void validate(String password) {
        if (password == null || password.length() < MIN_LENGTH) {
            throw invalid("Password must be at least 8 characters long.");
        }
        if (!UPPERCASE.matcher(password).find()) {
            throw invalid("Password must contain at least 1 uppercase letter.");
        }
        if (!LOWERCASE.matcher(password).find()) {
            throw invalid("Password must contain at least 1 lowercase letter.");
        }
        if (!DIGIT.matcher(password).find()) {
            throw invalid("Password must contain at least 1 digit.");
        }
        if (!SPECIAL.matcher(password).find()) {
            throw invalid("Password must contain at least 1 special character.");
        }
    }

    private static ApiException invalid(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "WEAK_PASSWORD", message);
    }
}
