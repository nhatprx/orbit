package com.orbit.admin.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.common.ApiException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;

/** Pure rules of the admin user module: sort whitelist, LIKE escaping and the admin guard. */
@ExtendWith(MockitoExtension.class)
class AdminUserSortAndGuardTest {

    @Mock private UserRepository users;

    private static List<String> properties(Sort sort) {
        return sort.stream().map(Sort.Order::getProperty).toList();
    }

    @Test
    void sortDefaultsToNewestFirstWithAStableTieBreaker() {
        assertEquals(AdminUserSort.DEFAULT, AdminUserSort.parse(null));
        assertEquals(AdminUserSort.DEFAULT, AdminUserSort.parse("   "));
        assertEquals(List.of("createdAt", "id"), properties(AdminUserSort.DEFAULT));
        assertEquals(Sort.Direction.DESC, AdminUserSort.DEFAULT.getOrderFor("createdAt").getDirection());
    }

    @Test
    void textColumnsSortIgnoringCaseButTimestampsDoNot() {
        Sort.Order username = AdminUserSort.parse("username,desc").getOrderFor("username");
        assertTrue(username.isIgnoreCase());
        assertEquals(Sort.Direction.DESC, username.getDirection());
        assertFalse(AdminUserSort.parse("createdAt,asc").getOrderFor("createdAt").isIgnoreCase());
    }

    @Test
    void directionDefaultsToAscendingAndInputIsTrimmed() {
        Sort sort = AdminUserSort.parse("  email , DESC ");
        assertEquals(Sort.Direction.DESC, sort.getOrderFor("email").getDirection());
        assertEquals(Sort.Direction.ASC, AdminUserSort.parse("displayName").getOrderFor("displayName").getDirection());
        assertEquals(List.of("role", "id"), properties(AdminUserSort.parse("role,asc")));
    }

    @Test
    void unknownFieldsDirectionsAndShapesAreRejected() {
        for (String bad : List.of("passwordHash", "id", "username,up", "username,asc,extra", ",asc", "username;drop table users")) {
            ApiException ex = assertThrows(ApiException.class, () -> AdminUserSort.parse(bad), bad);
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus(), bad);
            assertEquals("VALIDATION_ERROR", ex.getCode(), bad);
        }
    }

    @Test
    void likeWildcardsAndTheEscapeCharacterAreEscaped() {
        assertEquals("100\\%", AdminUserSpecs.escapeLike("100%"));
        assertEquals("a\\_b", AdminUserSpecs.escapeLike("a_b"));
        assertEquals("c\\\\d", AdminUserSpecs.escapeLike("c\\d"));
        assertEquals("plain text", AdminUserSpecs.escapeLike("plain text"));
    }

    private AdminAccessGuard guard() {
        return new AdminAccessGuard(users);
    }

    private UserEntity stored(String role) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setRole(role);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        return user;
    }

    private static AuthenticatedUserPrincipal claiming(UserEntity user, String role) {
        return new AuthenticatedUserPrincipal(user.getId(), "jti", role, "none");
    }

    @Test
    void guardRejectsMissingPrincipalsAndMissingUsersAsUnauthorized() {
        ApiException anonymous = assertThrows(ApiException.class, () -> guard().requireAdmin(null));
        assertEquals(HttpStatus.UNAUTHORIZED, anonymous.getStatus());

        UUID ghost = UUID.randomUUID();
        when(users.findById(ghost)).thenReturn(Optional.empty());
        ApiException gone = assertThrows(ApiException.class,
            () -> guard().requireAdmin(new AuthenticatedUserPrincipal(ghost, "jti", "admin", "none")));
        assertEquals(HttpStatus.UNAUTHORIZED, gone.getStatus());
    }

    @Test
    void guardTrustsTheDatabaseNotTheTokenClaim() {
        UserEntity demoted = stored("user");
        ApiException ex = assertThrows(ApiException.class, () -> guard().requireAdmin(claiming(demoted, "admin")));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertEquals("ADMIN_REQUIRED", ex.getCode());

        UserEntity promoted = stored("admin");
        assertEquals(promoted.getId(), guard().requireAdmin(claiming(promoted, "user")));
    }

    @Test
    void guardRefusesDisabledAdminsAndAcceptsTheRoleInAnyCase() {
        UserEntity disabled = stored("admin");
        disabled.accountStatus().disable(UUID.randomUUID(), null, Instant.now());
        assertThrows(ApiException.class, () -> guard().requireAdmin(claiming(disabled, "admin")));

        UserEntity shouting = stored("ADMIN");
        assertEquals(shouting.getId(), guard().requireAdmin(claiming(shouting, "admin")));
    }
}
