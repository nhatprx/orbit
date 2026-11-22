package com.orbit.whiteboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.orbit.auth.entity.UserEntity;
import com.orbit.support.AbstractIntegrationTest;
import com.orbit.support.ApiClient;
import com.orbit.support.ApiClient.Result;
import com.orbit.support.Fixtures;
import com.orbit.support.RequiresDocker;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

@RequiresDocker
class WhiteboardAssetsAndSecurityApiTest extends AbstractIntegrationTest {

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
    void assetUpsertListDeleteAndValidationWorkEndToEnd() {
        UserEntity owner = newUser("wb_asset");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Assets"), "whiteboard"));
        UUID boardId = Fixtures.idOf(api(owner).post(wsBoards(ws), """
            {"title":"Diagram With Images"}
            """));

        String pngB64 = Base64.getEncoder().encodeToString("png-v1".getBytes(StandardCharsets.UTF_8));
        String pngB64V2 = Base64.getEncoder().encodeToString("png-v2-updated".getBytes(StandardCharsets.UTF_8));

        Result first = api(owner).put(wsBoards(ws) + "/" + boardId + "/assets/img_1", """
            {"mimeType":"image/png","dataUrl":"data:image/png;base64,%s"}
            """.formatted(pngB64));
        assertEquals(200, first.status());
        assertEquals("img_1", first.<String>json("$.fileId"));
        assertEquals(6, first.<Integer>json("$.byteSize"));

        Result overwritten = api(owner).put(wsBoards(ws) + "/" + boardId + "/assets/img_1", """
            {"mimeType":"image/png","dataUrl":"data:image/png;base64,%s"}
            """.formatted(pngB64V2));
        assertEquals(200, overwritten.status());
        assertEquals(14, overwritten.<Integer>json("$.byteSize"));

        Result listed = api(owner).get(wsBoards(ws) + "/" + boardId + "/assets");
        assertEquals(200, listed.status());
        assertEquals(1, listed.<List<?>>json("$").size());

        Result badMime = api(owner).put(wsBoards(ws) + "/" + boardId + "/assets/bad_1", """
            {"mimeType":"text/html","dataUrl":"data:text/html;base64,%s"}
            """.formatted(pngB64));
        assertEquals(400, badMime.status());

        Result badUrl = api(owner).put(wsBoards(ws) + "/" + boardId + "/assets/bad_2", """
            {"mimeType":"image/png","dataUrl":"javascript:alert(1)"}
            """);
        assertEquals(400, badUrl.status());

        assertEquals(204, api(owner).delete(wsBoards(ws) + "/" + boardId + "/assets/img_1").status());
        assertEquals(0, api(owner).get(wsBoards(ws) + "/" + boardId + "/assets").<List<?>>json("$").size());
    }

    @Test
    void moduleGatingRbacAndUnauthenticatedChecksAreEnforced() throws Exception {
        UserEntity owner = newUser("wb_sec_owner");
        UserEntity member = newUser("wb_sec_member");
        UserEntity viewer = newUser("wb_sec_viewer");

        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("Sec"), "git", "whiteboard"));
        addWorkspaceMember(ws, member, "Member");

        Result viewerRole = api(owner).post(
            Fixtures.workspaceUrl(ws) + "/roles",
            Fixtures.roleBody("WB Viewer", "workspace.view", "whiteboard.read", "project.view_all")
        );
        assertEquals(201, viewerRole.status());
        addWorkspaceMember(ws, viewer, "WB Viewer");

        int unauthStatus = mvc.perform(get(wsBoards(ws))).andReturn().getResponse().getStatus();
        assertEquals(401, unauthStatus);

        Result memberCreated = api(member).post(wsBoards(ws), """
            {"title":"Member Board"}
            """);
        assertEquals(201, memberCreated.status());
        UUID boardId = Fixtures.idOf(memberCreated);

        assertEquals(403, api(member).delete(wsBoards(ws) + "/" + boardId).status());
        assertEquals(200, api(viewer).get(wsBoards(ws) + "/" + boardId).status());
        assertEquals(403, api(viewer).post(wsBoards(ws), """
            {"title":"Blocked"}
            """).status());
        assertEquals(403, api(viewer).patch(wsBoards(ws) + "/" + boardId, """
            {"title":"Blocked"}
            """).status());

        UUID project = Fixtures.idOf(Fixtures.createProject(api(owner), ws, "Sec Project"));
        UUID projBoard = Fixtures.idOf(api(owner).post(projBoards(ws, project), """
            {"title":"Project Board"}
            """));
        assertEquals(200, api(viewer).get(projBoards(ws, project) + "/" + projBoard).status());
        assertEquals(403, api(viewer).post(projBoards(ws, project), """
            {"title":"No Write"}
            """).status());

        assertEquals(
            200, api(owner).put(Fixtures.workspaceUrl(ws) + "/modules/whiteboard", "{\"enabled\":false}").status()
        );
        Result disabledWs = api(owner).get(wsBoards(ws));
        assertEquals(403, disabledWs.status());
        assertEquals("MODULE_DISABLED", disabledWs.<String>json("$.code"));

        Result disabledProj = api(owner).get(projBoards(ws, project));
        assertEquals(403, disabledProj.status());
        assertEquals("MODULE_DISABLED", disabledProj.<String>json("$.code"));

        assertEquals(
            200, api(owner).put(Fixtures.workspaceUrl(ws) + "/modules/whiteboard", "{\"enabled\":true}").status()
        );
        Result restored = api(owner).get(wsBoards(ws));
        assertEquals(200, restored.status());
        assertTrue(restored.<Integer>json("$.totalElements") >= 1);
    }
}
