package com.orbit.support;

import java.util.Arrays;
import java.util.UUID;
import java.util.stream.Collectors;

/** Request builders shared by API integration tests. */
public final class Fixtures {

    private Fixtures() {}

    public static String unique(String base) {
        return base + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    public static String quoted(String... values) {
        return Arrays.stream(values).map(v -> "\"" + v + "\"").collect(Collectors.joining(","));
    }

    public static ApiClient.Result createWorkspace(ApiClient api, String name, String... modules) {
        return api.post("/api/v1/workspaces", """
            {"name":"%s","description":"Test workspace","moduleKeys":[%s]}
            """.formatted(name, quoted(modules)));
    }

    public static ApiClient.Result createProject(ApiClient api, UUID workspaceId, String name) {
        return api.post("/api/v1/workspaces/" + workspaceId + "/projects", """
            {"name":"%s","description":"Test project"}
            """.formatted(name));
    }

    public static UUID workspaceRoleId(ApiClient api, UUID workspaceId, String roleName) {
        ApiClient.Result roles = api.get(workspaceUrl(workspaceId) + "/roles");
        return UUID.fromString(roles.<java.util.List<String>>json("$[?(@.name=='" + roleName + "')].id").getFirst());
    }

    public static UUID projectRoleId(ApiClient api, UUID workspaceId, UUID projectId, String roleName) {
        ApiClient.Result roles = api.get(projectUrl(workspaceId, projectId) + "/roles");
        return UUID.fromString(roles.<java.util.List<String>>json("$[?(@.name=='" + roleName + "')].id").getFirst());
    }

    public static String roleBody(String name, String... permissions) {
        return "{\"name\":\"" + name + "\",\"permissions\":[" + quoted(permissions) + "]}";
    }

    public static UUID idOf(ApiClient.Result result) {
        return UUID.fromString(result.json("$.id"));
    }

    public static String workspaceUrl(UUID workspaceId) {
        return "/api/v1/workspaces/" + workspaceId;
    }

    public static String projectUrl(UUID workspaceId, UUID projectId) {
        return workspaceUrl(workspaceId) + "/projects/" + projectId;
    }
}
