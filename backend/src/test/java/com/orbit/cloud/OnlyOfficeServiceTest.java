package com.orbit.cloud;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.cloud.config.CloudProperties;
import com.orbit.cloud.config.OnlyOfficeProperties;
import com.orbit.cloud.controller.OnlyOfficeCallbackController;
import com.orbit.cloud.dto.OnlyOfficeSessionResponse;
import com.orbit.cloud.entity.*;
import com.orbit.cloud.service.*;
import com.orbit.common.ApiException;
import com.orbit.storage.config.S3Properties;
import com.orbit.storage.service.CloudDownloadSigner;
import com.orbit.storage.service.CloudDownloadSigner.SignedDownloadUrl;
import com.orbit.storage.service.CloudStorageClient;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class OnlyOfficeServiceTest {

    private static final String PRESIGNED_URL = "https://orbit-bucket.s3.ap-southeast-1.amazonaws.com/doc?X-Amz-Signature=ok";

    private OnlyOfficeProperties props;
    private S3Properties s3Props;
    private OnlyOfficeTokenService tokenService;
    private CloudNodeService nodeService;
    private CloudDocumentService documentService;
    private CloudStorageClient storageClient;
    private OnlyOfficeFileFetcher fileFetcher;
    private UserRepository userRepository;
    private OnlyOfficeSessionService sessionService;
    private OnlyOfficeCallbackController controller;

    @BeforeEach
    void setUp() {
        props = new OnlyOfficeProperties();
        props.setEnabled(true);
        props.setPublicUrl("http://localhost:8082");
        props.setInternalUrl("http://onlyoffice:80");
        props.setJwtSecret("test-onlyoffice-secret-key-for-unit-tests-2026");
        props.setCallbackBaseUrl("http://host.docker.internal:8080/");
        s3Props = new S3Properties();
        tokenService = new OnlyOfficeTokenService(props, new ObjectMapper());
        nodeService = mock(CloudNodeService.class);
        documentService = mock(CloudDocumentService.class);
        storageClient = mock(CloudStorageClient.class);
        CloudDownloadSigner downloadSigner = mock(CloudDownloadSigner.class);
        fileFetcher = mock(OnlyOfficeFileFetcher.class);
        userRepository = mock(UserRepository.class);
        when(downloadSigner.signDownload(any(), any(), any()))
            .thenReturn(new SignedDownloadUrl(PRESIGNED_URL, Instant.now().plusSeconds(1800), "S3"));
        sessionService = new OnlyOfficeSessionService(
            props, tokenService, nodeService, userRepository, s3Props, downloadSigner
        );
        OnlyOfficeCallbackService callbackService = new OnlyOfficeCallbackService(
            props, new CloudProperties(), tokenService, nodeService, documentService, storageClient, fileFetcher
        );
        controller = new OnlyOfficeCallbackController(callbackService);
    }

    @Test
    void tokenServiceSignsVerifiesAndRejectsTamperedTokens() {
        String jwt = tokenService.signPayload(Map.of("status", 2, "url", "http://localhost:8082/file.docx"));
        assertEquals(2, ((Number) tokenService.verifyPayload(jwt).get("status")).intValue());
        String tampered = jwt.substring(0, jwt.length() - 3) + "xxx";
        ApiException ex = assertThrows(ApiException.class, () -> tokenService.verifyPayload(tampered));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
    }

    @Test
    void sessionServiceBuildsSignedConfigAndHandlesDisabledMode() {
        UUID userId = UUID.randomUUID();
        CloudScope scope = CloudScope.user(userId);
        CloudNodeEntity node = sampleDoc(scope, userId, "report.docx");
        when(nodeService.requireActiveNode(scope, node.getId())).thenReturn(node);
        UserEntity user = new UserEntity();
        user.setDisplayName("Alice Dev");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        OnlyOfficeSessionResponse res = sessionService.createSession(scope, userId, node.getId(), true);
        assertTrue(res.enabled());
        assertEquals("edit", res.mode());
        assertEquals("word", res.config().get("documentType"));
        assertEquals("word", tokenService.verifyPayload(res.token()).get("documentType"));
        String cbUrl = ((Map<?, ?>) res.config().get("editorConfig")).get("callbackUrl").toString();
        assertTrue(cbUrl.startsWith("http://host.docker.internal:8080/api/v1/cloud/onlyoffice/callback?token="));

        props.setEnabled(false);
        OnlyOfficeSessionResponse disabled = sessionService.createSession(scope, userId, node.getId(), false);
        assertFalse(disabled.enabled());
        assertEquals("view", disabled.mode());
    }

    @Test
    void sessionServiceResolvesFileSourceModeAcrossAutoS3AndProxy() {
        UUID userId = UUID.randomUUID();
        CloudScope scope = CloudScope.user(userId);
        CloudNodeEntity node = sampleDoc(scope, userId, "spec.docx");
        when(nodeService.requireActiveNode(scope, node.getId())).thenReturn(node);
        String proxyPrefix = "http://host.docker.internal:8080/api/v1/cloud/onlyoffice/file/" + node.getId() + "?token=";

        props.setFileSourceMode("auto");
        s3Props.setEndpoint("");
        assertEquals(PRESIGNED_URL, docUrl(sessionService.createSession(scope, userId, node.getId(), true)));
        s3Props.setEndpoint("http://localhost:9000");
        assertTrue(docUrl(sessionService.createSession(scope, userId, node.getId(), true)).startsWith(proxyPrefix));
        props.setFileSourceMode("s3");
        assertEquals(PRESIGNED_URL, docUrl(sessionService.createSession(scope, userId, node.getId(), true)));
        props.setFileSourceMode("proxy");
        s3Props.setEndpoint("");
        assertTrue(docUrl(sessionService.createSession(scope, userId, node.getId(), true)).startsWith(proxyPrefix));
    }

    @Test
    void callbackControllerStreamsFileAndSavesOnStatus2And6() {
        UUID userId = UUID.randomUUID();
        CloudScope scope = CloudScope.user(userId);
        CloudNodeEntity node = sampleDoc(scope, userId, "sheet.xlsx");
        when(nodeService.requireActiveNode(scope, node.getId())).thenReturn(node);
        when(storageClient.getBytes(eq(node.getStorageKey()), anyLong())).thenReturn(new byte[]{1, 2, 3});

        String fileToken = tokenService.createAccessToken("file", node.getId(), scope, userId, true, Duration.ofMinutes(10));
        ResponseEntity<byte[]> fileRes = controller.downloadFile(node.getId(), fileToken);
        assertEquals(HttpStatus.OK, fileRes.getStatusCode());
        assertArrayEquals(new byte[]{1, 2, 3}, fileRes.getBody());

        String cbToken = tokenService.createAccessToken("callback", node.getId(), scope, userId, true, Duration.ofMinutes(10));
        String ooJwt = tokenService.signPayload(Map.of("status", 2, "url", "http://localhost:8082/cache/edited.xlsx"));
        byte[] edited = new byte[]{9, 8, 7};
        when(fileFetcher.fetch(eq("http://onlyoffice:80/cache/edited.xlsx"), anyLong())).thenReturn(edited);
        assertEquals(0, controller.handleCallback(cbToken, "Bearer " + ooJwt, Map.of("status", 2)).get("error"));
        verify(documentService).replaceNodeBytes(scope, node.getId(), userId, edited);

        String ooJwt6 = tokenService.signPayload(Map.of("status", 6, "url", "http://localhost:8082/cache/forced.xlsx"));
        when(fileFetcher.fetch(eq("http://onlyoffice:80/cache/forced.xlsx"), anyLong())).thenReturn(edited);
        assertEquals(0, controller.handleCallback(cbToken, null, Map.of("token", ooJwt6)).get("error"));
    }

    @Test
    void callbackRejectsInvalidJwtAndIgnoresNonSaveStatus() {
        UUID userId = UUID.randomUUID();
        CloudScope scope = CloudScope.user(userId);
        String cbToken = tokenService.createAccessToken("callback", UUID.randomUUID(), scope, userId, true, Duration.ofMinutes(10));
        ApiException missing = assertThrows(ApiException.class,
            () -> controller.handleCallback(cbToken, null, Map.of("status", 2, "url", "http://localhost:8082/a.docx")));
        assertEquals(HttpStatus.UNAUTHORIZED, missing.getStatus());

        String status1Jwt = tokenService.signPayload(Map.of("status", 1));
        assertEquals(0, controller.handleCallback(cbToken, "Bearer " + status1Jwt, Map.of("status", 1)).get("error"));
        verify(documentService, never()).replaceNodeBytes(any(), any(), any(), any());
    }

    private static String docUrl(OnlyOfficeSessionResponse res) {
        return ((Map<?, ?>) res.config().get("document")).get("url").toString();
    }

    private static CloudNodeEntity sampleDoc(CloudScope scope, UUID userId, String name) {
        CloudNodeEntity n = new CloudNodeEntity();
        n.setId(UUID.randomUUID());
        n.setScopeType(scope.type());
        n.setScopeId(scope.scopeId());
        n.setNodeType(CloudNodeType.FILE);
        n.setName(name);
        n.setNameNormalized(name.toLowerCase());
        n.setMimeType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        n.setSizeBytes(512L);
        n.setStorageKey("cloud/users/" + userId + "/" + n.getId() + "/v1");
        n.setUploadStatus(CloudUploadStatus.READY);
        n.setCreatedBy(userId);
        n.setUpdatedBy(userId);
        n.setUpdatedAt(Instant.parse("2026-06-01T10:00:00Z"));
        return n;
    }
}
