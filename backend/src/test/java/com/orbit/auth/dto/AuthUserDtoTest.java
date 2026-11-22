package com.orbit.auth.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.orbit.auth.entity.UserEntity;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** The role in the API contract is lowercase, whatever case the row was written with. */
class AuthUserDtoTest {

    private static UserEntity userWithRole(String role) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setUsername("someone");
        user.setEmail("someone@orbit.test");
        user.setDisplayName("Someone");
        user.setRole(role);
        return user;
    }

    @Test
    void rolesWrittenInAnyCaseAreExposedInLowercase() {
        assertEquals("admin", AuthUserDto.from(userWithRole("ADMIN")).role());
        assertEquals("admin", AuthUserDto.from(userWithRole("Admin")).role());
        assertEquals("admin", AuthUserDto.from(userWithRole(" admin ")).role());
        assertEquals("user", AuthUserDto.from(userWithRole("USER")).role());
    }

    @Test
    void anAlreadyLowercaseRoleIsUnchanged() {
        assertEquals("admin", AuthUserDto.from(userWithRole("admin")).role());
        assertEquals("user", AuthUserDto.from(userWithRole("user")).role());
    }

    @Test
    void aMissingRoleFallsBackToTheLeastPrivilegedOne() {
        assertEquals("user", AuthUserDto.from(userWithRole(null)).role());
        assertEquals("user", AuthUserDto.from(userWithRole("  ")).role());
    }
}
