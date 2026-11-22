package com.orbit.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.orbit.auth.entity.UserEntity;
import com.orbit.support.AbstractIntegrationTest;
import com.orbit.support.ApiClient;
import com.orbit.support.ApiClient.Result;
import com.orbit.support.RequiresDocker;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

/** Access control, paging, search, filters and sorting of GET /api/v1/admin/users. */
@RequiresDocker
class AdminUserListApiTest extends AbstractIntegrationTest {

    private static final String URL = "/api/v1/admin/users";

    @Autowired private MockMvc mvc;

    private ApiClient api(UserEntity user) {
        return new ApiClient(mvc, user);
    }

    private static String token() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private UserEntity userWith(String prefix, String displayName) {
        UserEntity user = newUser(prefix);
        user.setDisplayName(displayName);
        return userRepository.save(user);
    }

    private static List<String> usernames(Result result) {
        return result.json("$.items[*].username");
    }

    private static int count(Result result) {
        return result.<List<Object>>json("$.items").size();
    }

    @Test
    void unauthenticatedRequestsAreRejected() throws Exception {
        assertEquals(401, mvc.perform(get(URL)).andReturn().getResponse().getStatus());
        assertEquals(401, mvc.perform(get(URL + "/stats")).andReturn().getResponse().getStatus());
        assertEquals(401, mvc.perform(get(URL + "/" + UUID.randomUUID())).andReturn().getResponse().getStatus());
    }

    @Test
    void onlyActiveDatabaseAdminsGetIn() throws Exception {
        UserEntity plain = newUser("plain");
        Result denied = api(plain).get(URL);
        assertEquals(403, denied.status());
        assertEquals("ADMIN_REQUIRED", denied.<String>json("$.code"));

        // The token claims admin but the database says user: a demoted admin is locked out at once.
        int stale = mvc.perform(get(URL).with(asClaiming(plain, "admin"))).andReturn().getResponse().getStatus();
        assertEquals(403, stale);

        UserEntity disabledAdmin = newAdmin("disabled");
        disabledAdmin.accountStatus().disable(disabledAdmin.getId(), "test", Instant.now());
        userRepository.save(disabledAdmin);
        assertEquals(403, api(disabledAdmin).get(URL).status());

        assertEquals(200, api(newAdmin("ok")).get(URL).status());
    }

    @Test
    void listIsBoundedPagedAndNewestFirst() {
        UserEntity admin = newAdmin("lister");
        String t = token();
        for (int i = 0; i < 3; i++) newUser("pg" + t);

        Result first = api(admin).get(URL + "?q=pg" + t + "&size=2");
        assertEquals(200, first.status());
        assertEquals(2, count(first));
        assertEquals(3, first.<Number>json("$.totalElements").intValue());
        assertEquals(2, first.<Number>json("$.totalPages").intValue());
        assertTrue(first.<Boolean>json("$.hasMore"));
        List<Instant> created = first.<List<String>>json("$.items[*].createdAt").stream().map(Instant::parse).toList();
        assertEquals(created.stream().sorted(Comparator.reverseOrder()).toList(), created);

        Result second = api(admin).get(URL + "?q=pg" + t + "&size=2&page=1");
        assertEquals(1, count(second));
        assertFalse(second.<Boolean>json("$.hasMore"));
        assertEquals(0, count(api(admin).get(URL + "?q=pg" + t + "&page=50")));
    }

    @Test
    void pageSizeAndPageNumberAreClamped() {
        UserEntity admin = newAdmin("clamp");
        assertEquals(100, api(admin).get(URL + "?size=1000").<Number>json("$.size").intValue());
        assertEquals(1, api(admin).get(URL + "?size=0").<Number>json("$.size").intValue());
        assertEquals(0, api(admin).get(URL + "?page=-5").<Number>json("$.page").intValue());
        assertEquals(400, api(admin).get(URL + "?page=abc").status());
    }

    @Test
    void searchMatchesUsernameEmailAndDisplayNameIgnoringCase() {
        UserEntity admin = newAdmin("seeker");
        String t = token();
        UserEntity byName = userWith("nm" + t, "Wonder Woman " + t);
        UserEntity byMail = newUser("ml" + t);
        byMail.setEmail("mail-" + t + "@orbit.test");
        userRepository.save(byMail);

        assertEquals(List.of(byName.getUsername()), usernames(api(admin).get(URL + "?q=wonder woman " + t.toUpperCase())));
        assertEquals(List.of(byMail.getUsername()), usernames(api(admin).get(URL + "?q=MAIL-" + t.toUpperCase())));
        assertTrue(usernames(api(admin).get(URL + "?q=" + byName.getUsername().toUpperCase())).contains(byName.getUsername()));
    }

    @Test
    void wildcardsInSearchTextMatchLiterally() {
        UserEntity admin = newAdmin("wild");
        String t = token();
        UserEntity percent = userWith("pc" + t, "A 100%-" + t);
        userWith("pd" + t, "B 1000-" + t);
        UserEntity underscore = userWith("uc" + t, "x_y-" + t);
        userWith("ud" + t, "xzy-" + t);

        assertEquals(List.of(percent.getUsername()), usernames(api(admin).get(URL + "?q=100%-" + t)));
        assertEquals(List.of(underscore.getUsername()), usernames(api(admin).get(URL + "?q=x_y-" + t)));
    }

    @Test
    void injectionLikeSearchTextIsHarmless() {
        UserEntity admin = newAdmin("inject");
        // MockMvc encodes URL templates itself, so the raw text is passed here.
        Result result = api(admin).get(URL + "?q=' OR 1=1 --");
        assertEquals(200, result.status());
        assertEquals(0, count(result));
    }

    @Test
    void roleAndStatusFiltersCombine() {
        UserEntity admin = newAdmin("filter");
        String t = token();
        UserEntity boss = newAdmin("fa" + t);
        UserEntity banned = newUser("fd" + t);
        banned.accountStatus().disable(admin.getId(), "spam", Instant.now());
        userRepository.save(banned);
        UserEntity normal = newUser("fn" + t);

        assertEquals(3, count(api(admin).get(URL + "?q=" + t)));
        assertEquals(List.of(boss.getUsername()), usernames(api(admin).get(URL + "?q=" + t + "&role=admin")));
        assertEquals(2, count(api(admin).get(URL + "?q=" + t + "&role=USER")));
        assertEquals(List.of(banned.getUsername()), usernames(api(admin).get(URL + "?q=" + t + "&status=disabled")));
        assertEquals(2, count(api(admin).get(URL + "?q=" + t + "&status=active")));
        assertEquals(List.of(normal.getUsername()), usernames(api(admin).get(URL + "?q=" + t + "&role=user&status=active")));
        assertEquals("DISABLED", api(admin).get(URL + "?q=fd" + t).<List<String>>json("$.items[*].status").getFirst());
    }

    @Test
    void invalidFiltersAndSortAreRejectedWithValidationErrors() {
        UserEntity admin = newAdmin("strict");
        for (String query : List.of(
            "role=root", "status=banned", "sort=passwordHash", "sort=username,sideways", "sort=username,asc,extra",
            "q=" + "a".repeat(101)
        )) {
            Result result = api(admin).get(URL + "?" + query);
            assertEquals(400, result.status(), query);
            assertEquals("VALIDATION_ERROR", result.<String>json("$.code"), query);
        }
    }

    @Test
    void sortingIsWhitelistedAndTextSortsIgnoreCase() {
        UserEntity admin = newAdmin("sorter");
        String t = token();
        userWith("a" + t, "alpha " + t);
        userWith("b" + t, "Bravo " + t);
        userWith("c" + t, "charlie " + t);

        List<String> asc = usernames(api(admin).get(URL + "?q=" + t + "&sort=username,asc"));
        assertEquals(asc.stream().sorted().toList(), asc);
        List<String> desc = usernames(api(admin).get(URL + "?q=" + t + "&sort=username,desc"));
        assertEquals(asc.reversed(), desc);

        List<String> names = api(admin).get(URL + "?q=" + t + "&sort=displayName").json("$.items[*].displayName");
        assertEquals(List.of("alpha " + t, "Bravo " + t, "charlie " + t), names);
    }
}
