package com.orbit.cloud;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.cloud.config.CloudProperties;
import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.cloud.entity.CloudScopeType;
import com.orbit.cloud.entity.CloudStorageQuotaEntity;
import com.orbit.cloud.entity.CloudStorageQuotaId;
import com.orbit.cloud.entity.CloudUploadSessionEntity;
import com.orbit.cloud.entity.CloudUploadSessionStatus;
import com.orbit.cloud.entity.CloudUploadStatus;
import com.orbit.cloud.entity.CloudUploadStrategy;
import com.orbit.cloud.repository.CloudNodeRepository;
import com.orbit.cloud.repository.CloudStorageQuotaRepository;
import com.orbit.cloud.repository.CloudUploadSessionRepository;
import com.orbit.cloud.service.CloudCursor;
import com.orbit.cloud.service.CloudNameValidator;
import com.orbit.cloud.service.CloudQuotaService;
import com.orbit.cloud.service.CloudScope;
import com.orbit.cloud.service.CloudUploadHelper;
import com.orbit.common.ApiException;
import com.orbit.storage.service.CloudKeyFactory;
import com.orbit.storage.service.CloudStorageClient;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpStatus;

class CloudUnitTest {

    @Test
    void nameValidatorRejectsInvalidAndNormalizesValid() {
        assertEquals("Report 2026.pdf", CloudNameValidator.validateAndTrim("  Report 2026.pdf  "));
        assertEquals("report 2026.pdf", CloudNameValidator.normalize("Report 2026.pdf"));
        assertThrows(ApiException.class, () -> CloudNameValidator.validateAndTrim("   "));
        assertThrows(ApiException.class, () -> CloudNameValidator.validateAndTrim(".."));
        assertThrows(ApiException.class, () -> CloudNameValidator.validateAndTrim("a/b.txt"));
        assertThrows(ApiException.class, () -> CloudNameValidator.validateAndTrim("a\\b.txt"));
    }

    @Test
    void cursorRoundTripsAndRejectsGarbage() {
        CloudNodeEntity node = new CloudNodeEntity();
        node.setId(UUID.randomUUID());
        node.setNodeType(CloudNodeType.FILE);
        node.setNameNormalized("alpha.txt");
        node.setSizeBytes(4096L);

        String encodedName = CloudCursor.encode(node, "name");
        CloudCursor decodedName = CloudCursor.decode(encodedName);
        assertEquals(1, decodedName.typeRank());
        assertEquals("alpha.txt", decodedName.sortValue());
        assertEquals(node.getId(), decodedName.id());

        String encodedSize = CloudCursor.encode(node, "size");
        assertEquals(4096L, CloudCursor.decode(encodedSize).sortValueAsLong());

        ApiException bad = assertThrows(ApiException.class, () -> CloudCursor.decode("not-valid-base64!"));
        assertEquals("INVALID_CURSOR", bad.getCode());
    }

    @Test
    void keyFactoryUsesImmutableUuidHierarchy() {
        UUID scopeId = UUID.randomUUID();
        UUID nodeId = UUID.randomUUID();
        assertTrue(CloudKeyFactory.userKey(scopeId, nodeId).startsWith("cloud/users/" + scopeId + "/" + nodeId + "/"));
        assertTrue(CloudKeyFactory.workspaceKey(scopeId, nodeId).startsWith("cloud/workspaces/" + scopeId + "/" + nodeId + "/"));
        assertTrue(CloudKeyFactory.projectKey(scopeId, nodeId).startsWith("cloud/projects/" + scopeId + "/" + nodeId + "/"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void quotaServiceRollsBackRedisReservationWhenExceeded() {
        CloudStorageQuotaRepository repo = mock(CloudStorageQuotaRepository.class);
        CloudProperties props = new CloudProperties();
        props.setUserQuotaBytes(1000L);
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> ops = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(ops);
        ObjectProvider<StringRedisTemplate> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(redis);

        UUID userId = UUID.randomUUID();
        CloudScope scope = CloudScope.user(userId);
        CloudStorageQuotaEntity entity = new CloudStorageQuotaEntity(CloudScopeType.USER, userId, 1000L);
        entity.setUsedBytes(800L);
        when(repo.findById(new CloudStorageQuotaId(CloudScopeType.USER, userId))).thenReturn(Optional.of(entity));
        when(ops.increment(anyString(), anyLong())).thenReturn(300L);
        when(ops.decrement(anyString(), anyLong())).thenReturn(0L);

        CloudQuotaService service = new CloudQuotaService(repo, props, provider);
        ApiException ex = assertThrows(ApiException.class, () -> service.reserve(scope, 300L));
        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, ex.getStatus());
        assertEquals("QUOTA_EXCEEDED", ex.getCode());
        verify(ops).decrement(anyString(), anyLong());
        verify(redis).delete(anyString());
    }

    @Test
    void commitUploadThrowsWhenConditionalDbUpdateReturnsZero() {
        CloudStorageQuotaRepository repo = mock(CloudStorageQuotaRepository.class);
        @SuppressWarnings("unchecked")
        ObjectProvider<StringRedisTemplate> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(null);
        when(repo.tryAddUsedBytes(anyString(), any(), anyLong())).thenReturn(0);

        CloudQuotaService service = new CloudQuotaService(repo, new CloudProperties(), provider);
        ApiException ex = assertThrows(
            ApiException.class,
            () -> service.commitUpload(CloudScope.user(UUID.randomUUID()), 100L, 100L)
        );
        assertEquals("QUOTA_EXCEEDED", ex.getCode());
    }

    @Test
    void clearStalePendingDuplicateAbortsSessionReleasesQuotaAndIgnoresStorageError() {
        CloudNodeRepository nodeRepo = mock(CloudNodeRepository.class);
        CloudUploadSessionRepository sessionRepo = mock(CloudUploadSessionRepository.class);
        CloudQuotaService quotaService = mock(CloudQuotaService.class);
        CloudStorageClient storageClient = mock(CloudStorageClient.class);

        UUID userId = UUID.randomUUID();
        UUID nodeId = UUID.randomUUID();
        CloudScope scope = CloudScope.user(userId);

        CloudNodeEntity staleNode = new CloudNodeEntity();
        staleNode.setId(nodeId);
        staleNode.setUploadStatus(CloudUploadStatus.PENDING);

        CloudUploadSessionEntity session = new CloudUploadSessionEntity();
        session.setNodeId(nodeId);
        session.setStrategy(CloudUploadStrategy.MULTIPART);
        session.setStorageKey("cloud/users/" + userId + "/" + nodeId + "/obj");
        session.setS3UploadId("mp-123");
        session.setExpectedSizeBytes(2048L);
        session.setStatus(CloudUploadSessionStatus.OPEN);

        when(nodeRepo.findPendingSiblings(CloudScopeType.USER, userId, null, "report.pdf"))
            .thenReturn(List.of(staleNode));
        when(sessionRepo.findByNodeIdAndStatus(nodeId, CloudUploadSessionStatus.OPEN))
            .thenReturn(List.of(session));
        doThrow(new RuntimeException("s3 timeout"))
            .when(storageClient).abortMultipartUpload(session.getStorageKey(), "mp-123");

        CloudUploadHelper helper = new CloudUploadHelper(nodeRepo, sessionRepo, quotaService, storageClient);
        helper.clearStalePendingDuplicate(scope, null, "report.pdf");

        assertEquals(CloudUploadStatus.FAILED, staleNode.getUploadStatus());
        assertEquals(CloudUploadSessionStatus.ABORTED, session.getStatus());
        verify(quotaService).releaseReservation(scope, 2048L);
        verify(storageClient).abortMultipartUpload(session.getStorageKey(), "mp-123");
        verify(sessionRepo).saveAll(List.of(session));
        verify(nodeRepo).saveAllAndFlush(List.of(staleNode));
    }
}
