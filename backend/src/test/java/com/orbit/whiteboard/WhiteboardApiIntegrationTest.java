package com.orbit.whiteboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.jayway.jsonpath.JsonPath;

import com.orbit.auth.entity.UserEntity;
import com.orbit.support.AbstractIntegrationTest;
import com.orbit.support.ApiClient;
import com.orbit.support.ApiClient.Result;
import com.orbit.support.Fixtures;
import com.orbit.support.RequiresDocker;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

@RequiresDocker
class WhiteboardApiIntegrationTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mvc;

    private ApiClient api(UserEntity user) {
        return new ApiClient(mvc, user);
    }

    private static String wsBoards(UUID wsId) {
        return Fixtures.workspaceUrl(wsId) + "/whiteboards";
    }

    private static String projBoards(UUID wsId, UUID projId) {
        return Fixtures.projectUrl(wsId, projId) + "/whiteboards";
    }

    @Test
    void workspaceCrudSearchPaginationAndOptimisticLockingWorkEndToEnd() throws Exception {
        UserEntity owner = newUser("wb_owner");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("WB"), "whiteboard"));

        Result created = api(owner).post(wsBoards(ws), """
            {"title":"  System Architecture 100%  ","description":"Core diagram"}
            """);
        assertEquals(201, created.status());
        UUID boardId = Fixtures.idOf(created);
        assertEquals("System Architecture 100%", created.<String>json("$.title"));
        assertEquals("Core diagram", created.<String>json("$.description"));
        assertNull(created.json("$.projectId"));
        assertEquals(1, created.<Integer>json("$.version"));
        assertEquals(0, created.<Integer>json("$.elementCount"));
        Map<String, Object> initialScene = created.json("$.sceneJson");
        assertEquals("excalidraw", initialScene.get("type"));

        Result second = api(owner).post(wsBoards(ws), """
            {"title":"Sprint Retro","description":"Notes"}
            """);
        assertEquals(201, second.status());

        Result paged = api(owner).get(wsBoards(ws) + "?page=0&size=1");
        assertEquals(200, paged.status());
        assertEquals(1, paged.<List<?>>json("$.items").size());
        assertEquals(2, paged.<Integer>json("$.totalElements"));
        assertTrue(paged.<Boolean>json("$.hasMore"));

        Result searched = api(owner).get(wsBoards(ws) + "?q=architecture");
        assertEquals(200, searched.status());
        assertEquals(1, searched.<Integer>json("$.totalElements"));
        assertEquals(boardId.toString(), searched.<String>json("$.items[0].id"));

        String wildcardBody = mvc.perform(get(wsBoards(ws)).param("q", "100%").with(as(owner)))
            .andReturn().getResponse().getContentAsString();
        assertEquals(1, (int) JsonPath.read(wildcardBody, "$.totalElements"));
        assertEquals(boardId.toString(), JsonPath.read(wildcardBody, "$.items[0].id"));

        Result patched = api(owner).patch(wsBoards(ws) + "/" + boardId, """
            {"title":"Updated Architecture","description":"Revised"}
            """);
        assertEquals(200, patched.status());
        assertEquals("Updated Architecture", patched.<String>json("$.title"));
        assertEquals(1, patched.<Integer>json("$.version"));

        String sceneV2 = """
            {
              "expectedVersion": 1,
              "elementCount": 2,
              "sceneJson": {"type":"excalidraw","version":2,"elements":[{"id":"e1"},{"id":"e2"}],"appState":{"theme":"dark"}}
            }
            """;
        Result saved = api(owner).put(wsBoards(ws) + "/" + boardId + "/scene", sceneV2);
        assertEquals(200, saved.status());
        assertEquals(2, saved.<Integer>json("$.version"));
        assertEquals(2, saved.<Integer>json("$.elementCount"));

        Result conflict = api(owner).put(wsBoards(ws) + "/" + boardId + "/scene", sceneV2);
        assertEquals(409, conflict.status());
        assertEquals("WHITEBOARD_VERSION_CONFLICT", conflict.<String>json("$.code"));

        Result detail = api(owner).get(wsBoards(ws) + "/" + boardId);
        assertEquals(200, detail.status());
        assertEquals(2, detail.<Integer>json("$.version"));
        assertEquals(2, detail.<List<?>>json("$.sceneJson.elements").size());

        assertEquals(204, api(owner).delete(wsBoards(ws) + "/" + boardId).status());
        assertEquals(404, api(owner).get(wsBoards(ws) + "/" + boardId).status());
    }

    @Test
    void workspaceAndProjectScopesAreStrictlyIsolated() {
        UserEntity owner = newUser("wb_iso");
        UUID ws1 = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Iso1"), "whiteboard"));
        UUID ws2 = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Iso2"), "whiteboard"));
        UUID projA = Fixtures.idOf(Fixtures.createProject(api(owner), ws1, "Project A"));
        UUID projB = Fixtures.idOf(Fixtures.createProject(api(owner), ws1, "Project B"));

        UUID wsBoard = Fixtures.idOf(api(owner).post(wsBoards(ws1), """
            {"title":"Workspace Board"}
            """));
        Result projCreated = api(owner).post(projBoards(ws1, projA), """
            {"title":"Project A Board"}
            """);
        assertEquals(201, projCreated.status());
        UUID projBoard = Fixtures.idOf(projCreated);
        assertEquals(projA.toString(), projCreated.<String>json("$.projectId"));

        assertEquals(1, api(owner).get(wsBoards(ws1)).<Integer>json("$.totalElements"));
        assertEquals(1, api(owner).get(projBoards(ws1, projA)).<Integer>json("$.totalElements"));
        assertEquals(0, api(owner).get(projBoards(ws1, projB)).<Integer>json("$.totalElements"));

        assertEquals(404, api(owner).get(projBoards(ws1, projA) + "/" + wsBoard).status());
        assertEquals(404, api(owner).get(wsBoards(ws1) + "/" + projBoard).status());
        assertEquals(404, api(owner).get(projBoards(ws1, projB) + "/" + projBoard).status());
        assertEquals(404, api(owner).get(wsBoards(ws2) + "/" + wsBoard).status());
        assertEquals(404, api(owner).delete(wsBoards(ws1) + "/" + projBoard).status());

        String saveBody = """
            {"expectedVersion":1,"elementCount":1,"sceneJson":{"type":"excalidraw","version":2,"elements":[{"id":"p1"}],"appState":{}}}
            """;
        assertEquals(404, api(owner).put(wsBoards(ws1) + "/" + projBoard + "/scene", saveBody).status());
        Result projSaved = api(owner).put(projBoards(ws1, projA) + "/" + projBoard + "/scene", saveBody);
        assertEquals(200, projSaved.status());
        assertEquals(2, projSaved.<Integer>json("$.version"));
        assertFalse(api(owner).get(wsBoards(ws1)).<List<String>>json("$.items[*].id").contains(projBoard.toString()));
    }
}
