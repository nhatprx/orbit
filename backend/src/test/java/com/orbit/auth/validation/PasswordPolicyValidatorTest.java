package com.orbit.auth.validation;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.orbit.common.ApiException;
import org.junit.jupiter.api.Test;

class PasswordPolicyValidatorTest {

    @Test
    void acceptsValidStrongPassword() {
        assertDoesNotThrow(() -> PasswordPolicyValidator.validate("Orbit@2026"));
        assertDoesNotThrow(() -> PasswordPolicyValidator.validate("Strong#Pass9"));
    }

    @Test
    void rejectsPasswordShorterThan8Chars() {
        ApiException ex = assertThrows(
            ApiException.class,
            () -> PasswordPolicyValidator.validate("Ab1@xyz")
        );
        assertEquals("WEAK_PASSWORD", ex.getCode());
    }

    @Test
    void rejectsMissingUppercase() {
        assertThrows(ApiException.class, () -> PasswordPolicyValidator.validate("orbit@2026"));
    }

    @Test
    void rejectsMissingLowercase() {
        assertThrows(ApiException.class, () -> PasswordPolicyValidator.validate("ORBIT@2026"));
    }

    @Test
    void rejectsMissingDigit() {
        assertThrows(ApiException.class, () -> PasswordPolicyValidator.validate("Orbit@Pass"));
    }

    @Test
    void rejectsMissingSpecialChar() {
        assertThrows(ApiException.class, () -> PasswordPolicyValidator.validate("Orbit2026A"));
    }
}
