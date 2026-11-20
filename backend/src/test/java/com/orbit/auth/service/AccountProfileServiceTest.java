package com.orbit.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.auth.dto.AuthUserDto;
import com.orbit.auth.dto.UpdateAccountProfileRequest;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.common.ApiException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class AccountProfileServiceTest {

    @Mock
    private UserRepository userRepository;

    private AccountProfileService service;

    @BeforeEach
    void setUp() {
        service = new AccountProfileService(userRepository, null);
    }

    @Test
    void updatesUsernameAndDisplayNameWhenAvailable() {
        UserEntity user = buildUser("old_name", "Old Name");
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(userRepository.existsByUsernameIgnoreCase("nhatprx")).thenReturn(false);
        when(userRepository.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        AuthUserDto updated = service.updateProfile(
            user.getId(),
            new UpdateAccountProfileRequest(" NhatPrx ", "Nhat Nguyen")
        );

        assertEquals("nhatprx", updated.username());
        assertEquals("Nhat Nguyen", updated.name());
    }

    @Test
    void rejectsDuplicateAndInvalidUsername() {
        UserEntity user = buildUser("nhatprx", "Nhat");
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(userRepository.existsByUsernameIgnoreCase("taken_user")).thenReturn(true);

        ApiException conflict = assertThrows(ApiException.class, () ->
            service.updateProfile(user.getId(), new UpdateAccountProfileRequest("taken_user", null))
        );
        assertEquals(HttpStatus.CONFLICT, conflict.getStatus());
        assertEquals("USERNAME_TAKEN", conflict.getCode());

        ApiException invalid = assertThrows(ApiException.class, () ->
            service.updateProfile(user.getId(), new UpdateAccountProfileRequest("a!", null))
        );
        assertEquals(HttpStatus.BAD_REQUEST, invalid.getStatus());
        assertEquals("INVALID_USERNAME", invalid.getCode());
    }

    @Test
    void keepingSameUsernameIsNoOpWithoutConflictCheck() {
        UserEntity user = buildUser("nhatprx", "Nhat");
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        AuthUserDto res = service.updateProfile(
            user.getId(),
            new UpdateAccountProfileRequest("NHATPRX", "Nhat")
        );

        assertEquals("nhatprx", res.username());
        verify(userRepository, never()).existsByUsernameIgnoreCase(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void updatesProfileDetailsPresenceAndPinnedProjects() {
        UserEntity user = buildUser("nhatprx", "Nhat");
        UUID p1 = UUID.randomUUID();
        UUID p2 = UUID.randomUUID();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(userRepository.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        AuthUserDto res = service.updateProfile(
            user.getId(),
            new UpdateAccountProfileRequest(
                null,
                null,
                "Systems engineer",
                "Building Orbit platform.",
                "Orbit Labs",
                "Ho Chi Minh City",
                "https://orbit.dev",
                null,
                "busy",
                List.of(p1.toString(), p2.toString(), p1.toString())
            )
        );

        assertEquals("Systems engineer", res.bio());
        assertEquals("Building Orbit platform.", res.introduction());
        assertEquals("Orbit Labs", res.organization());
        assertEquals("Ho Chi Minh City", res.location());
        assertEquals("https://orbit.dev", res.website());
        assertEquals("BUSY", res.activeStatus());
        assertEquals(List.of(p1.toString(), p2.toString()), res.pinnedProjectIds());

        AuthUserDto offline = service.updateProfile(
            user.getId(),
            new UpdateAccountProfileRequest(null, null, null, null, null, null, null, null, "OFFLINE", null)
        );
        assertFalse(offline.activeStatusEnabled());
        assertEquals("OFFLINE", offline.activeStatus());
    }

    @Test
    void rejectsInvalidWebsiteAndInvalidPinnedProjectIds() {
        UserEntity user = buildUser("nhatprx", "Nhat");
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        ApiException badUrl = assertThrows(ApiException.class, () ->
            service.updateProfile(
                user.getId(),
                new UpdateAccountProfileRequest(null, null, null, null, null, null, "javascript:alert(1)", null, null, null)
            )
        );
        assertEquals("INVALID_WEBSITE", badUrl.getCode());

        ApiException badUuid = assertThrows(ApiException.class, () ->
            service.updateProfile(
                user.getId(),
                new UpdateAccountProfileRequest(null, null, null, null, null, null, null, null, null, List.of("not-a-uuid"))
            )
        );
        assertEquals("INVALID_PROJECT_ID", badUuid.getCode());

        ApiException badStatus = assertThrows(ApiException.class, () ->
            service.updateProfile(
                user.getId(),
                new UpdateAccountProfileRequest(null, null, null, null, null, null, null, null, "INVISIBLE", null)
            )
        );
        assertEquals("INVALID_ACTIVE_STATUS", badStatus.getCode());
    }

    private UserEntity buildUser(String username, String displayName) {
        UserEntity u = new UserEntity();
        u.setId(UUID.randomUUID());
        u.setUsername(username);
        u.setEmail(username + "@orbit.dev");
        u.setDisplayName(displayName);
        u.setRole("user");
        u.setWorkspaceId("ws_orbit_core");
        return u;
    }
}
