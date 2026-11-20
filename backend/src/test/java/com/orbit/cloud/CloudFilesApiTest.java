package com.orbit.cloud;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.auth.entity.UserEntity;
import com.orbit.storage.service.CloudDownloadSigner;
import com.orbit.storage.service.CloudDownloadSigner.SignedDownloadUrl;
import com.orbit.storage.service.CloudStorageClient;
import com.orbit.storage.service.CloudStorageClient.HeadObjectResult;
import com.orbit.storage.service.CloudStorageClient.PresignedUploadResult;
import com.orbit.support.AbstractIntegrationTest;
import com.orbit.support.ApiClient;
import com.orbit.support.ApiClient.Result;
import com.orbit.support.Fixtures;
import com.orbit.support.RequiresDocker;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@RequiresDocker
class CloudFilesApiTest extends AbstractIntegrationTest {

    @Autowired private MockMvc mvc;
    @MockitoBean private CloudStorageClient storageClient;
    @MockitoBean private CloudDownloadSigner downloadSigner;

    private ApiClient api(UserEntity user) {
        return new ApiClient(mvc, user);
    }

    @BeforeEach
    void stubStorage() {
        when(storageClient.isAvailable()).thenReturn(true);
        when(storageClient.presignPutObject(anyString(), anyString(), anyLong(), any())).thenReturn(
            new PresignedUploadResult("https://s3.test/put", Map.of("Content-Type", "text/plain"), Instant.now().plusSeconds(900))
        );
        when(storageClient.createMultipartUpload(anyString(), anyString())).thenReturn("mp-upload-1");
        when(storageClient.presignUploadPart(anyString(), anyString(), anyInt(), any()))
            .thenAnswer(inv -> "https://s3.test/part/" + inv.getArgument(2));
        when(storageClient.completeMultipartUpload(anyString(), anyString(), any())).thenReturn("\"etag-mp\"");
        when(storageClient.headObject(anyString()))
            .thenReturn(Optional.of(new HeadObjectResult(1024L, "\"etag-1\"", "text/plain")));
        when(downloadSigner.signDownload(anyString(), anyString(), anyString()))
            .thenReturn(new SignedDownloadUrl("https://cdn.test/signed", Instant.now().plusSeconds(900), "CLOUDFRONT"));
    }

    @Test
    void folderCrudCycleDetectionBreadcrumbsAndUserIsolation() {
        UserEntity alice = newUser("alice");
        UserEntity bob = newUser("bob");

        Result root = api(alice).post("/api/v1/cloud/me/folders", "{\"name\":\"Docs\"}");
        assertEquals(201, root.status());
        UUID rootId = Fixtures.idOf(root);

        assertEquals(409, api(alice).post("/api/v1/cloud/me/folders", "{\"name\":\"docs\"}").status());

        Result child = api(alice).post("/api/v1/cloud/me/folders", "{\"parentId\":\"" + rootId + "\",\"name\":\"Specs\"}");
        assertEquals(201, child.status());
        UUID childId = Fixtures.idOf(child);

        Result crumbs = api(alice).get("/api/v1/cloud/me/nodes/" + childId + "/breadcrumbs");
        assertEquals(200, crumbs.status());
        assertEquals(List.of("Docs", "Specs"), crumbs.<List<String>>json("$.items[*].name"));

        Result cycle = api(alice).patch("/api/v1/cloud/me/nodes/" + rootId, "{\"parentId\":\"" + childId + "\"}");
        assertEquals(400, cycle.status());
        assertEquals("FOLDER_CYCLE", cycle.<String>json("$.code"));

        assertEquals(404, api(bob).get("/api/v1/cloud/me/nodes/" + rootId + "/breadcrumbs").status());
        assertEquals(0, api(bob).get("/api/v1/cloud/me/nodes").<List<?>>json("$.items").size());

        Result moved = api(alice).patch("/api/v1/cloud/me/nodes/" + childId, "{\"moveToRoot\":true,\"starred\":true}");
        assertEquals(200, moved.status());
        assertTrue(moved.<Boolean>json("$.starred"));
        assertEquals(0, moved.<Integer>json("$.depth"));
    }

    @Test
    void singleAndMultipartUploadDownloadTrashAndQuotaLifecycle() {
        UserEntity owner = newUser("uploader");
        Result init = api(owner).post("/api/v1/cloud/me/uploads/init",
            "{\"name\":\"readme.txt\",\"mimeType\":\"text/plain\",\"sizeBytes\":1024}");
        assertEquals(201, init.status());
        assertEquals("SINGLE", init.<String>json("$.strategy"));
        String sessionId = init.json("$.sessionId");
        String nodeId = init.json("$.nodeId");

        Result completed = api(owner).post("/api/v1/cloud/me/uploads/" + sessionId + "/complete", "{\"checksumSha256\":\"abc\"}");
        assertEquals(200, completed.status());
        assertEquals(1024, completed.<Integer>json("$.sizeBytes"));

        Result quota = api(owner).get("/api/v1/cloud/me/quota");
        assertEquals(1024, quota.<Integer>json("$.usedBytes"));

        Result dl = api(owner).get("/api/v1/cloud/me/nodes/" + nodeId + "/download");
        assertEquals(200, dl.status());
        assertEquals("CLOUDFRONT", dl.<String>json("$.provider"));

        Result trashed = api(owner).delete("/api/v1/cloud/me/nodes/" + nodeId);
        assertEquals(200, trashed.status());
        assertNotNull(trashed.<String>json("$.purgeAfter"));
        assertEquals(1, api(owner).get("/api/v1/cloud/me/nodes?view=TRASH").<List<?>>json("$.items").size());

        assertEquals(200, api(owner).post("/api/v1/cloud/me/nodes/" + nodeId + "/restore", "{}").status());
        assertEquals(200, api(owner).delete("/api/v1/cloud/me/nodes/" + nodeId).status());

        Result emptied = api(owner).delete("/api/v1/cloud/me/trash");
        assertEquals(200, emptied.status());
        assertEquals(1024, emptied.<Integer>json("$.freedBytes"));
        assertEquals(0, api(owner).get("/api/v1/cloud/me/quota").<Integer>json("$.usedBytes"));
        verify(storageClient).deleteObjects(any());

        Result mpInit = api(owner).post("/api/v1/cloud/me/uploads/init",
            "{\"name\":\"archive.bin\",\"mimeType\":\"application/octet-stream\",\"sizeBytes\":60000000}");
        assertEquals(201, mpInit.status());
        assertEquals("MULTIPART", mpInit.<String>json("$.strategy"));
        String mpSession = mpInit.json("$.sessionId");

        Result signed = api(owner).post("/api/v1/cloud/me/uploads/" + mpSession + "/parts/sign", "{\"partNumbers\":[1,2]}");
        assertEquals(200, signed.status());
        assertEquals(2, signed.<List<?>>json("$.parts").size());
        assertEquals(204, api(owner).post("/api/v1/cloud/me/uploads/" + mpSession + "/abort", "{}").status());
    }

    @Test
    void workspaceAndProjectRbacAndModuleGating() {
        UserEntity owner = newUser("wsowner");
        UserEntity member = newUser("wsmember");
        UUID ws = Fixtures.idOf(Fixtures.createWorkspace(api(owner), Fixtures.unique("CloudWS"), "git"));
        addWorkspaceMember(ws, member, "Member");
        String wsBase = "/api/v1/workspaces/" + ws + "/cloud";

        Result disabled = api(owner).get(wsBase + "/nodes");
        assertEquals(403, disabled.status());
        assertEquals("MODULE_DISABLED", disabled.<String>json("$.code"));

        assertEquals(200, api(owner).put(Fixtures.workspaceUrl(ws) + "/modules/cloud", "{\"enabled\":true}").status());
        Result wsFolder = api(member).post(wsBase + "/folders", "{\"name\":\"Shared\"}");
        assertEquals(201, wsFolder.status());
        UUID wsFolderId = Fixtures.idOf(wsFolder);

        assertEquals(200, api(member).delete(wsBase + "/nodes/" + wsFolderId).status());
        assertEquals(403, api(member).delete(wsBase + "/nodes/" + wsFolderId + "/permanent").status());
        assertEquals(403, api(member).delete(wsBase + "/trash").status());
        assertEquals(204, api(owner).delete(wsBase + "/nodes/" + wsFolderId + "/permanent").status());

        UUID project = Fixtures.idOf(Fixtures.createProject(api(owner), ws, "CloudProj"));
        addProjectMember(project, member, "Member");
        String projBase = "/api/v1/workspaces/" + ws + "/projects/" + project + "/cloud";

        Result projFolder = api(member).post(projBase + "/folders", "{\"name\":\"Assets\"}");
        assertEquals(201, projFolder.status());
        assertFalse(api(owner).get(wsBase + "/nodes").<List<?>>json("$.items").stream()
            .anyMatch(item -> item.toString().contains("Assets")));
        assertEquals(403, api(member).delete(projBase + "/trash").status());
    }
}
