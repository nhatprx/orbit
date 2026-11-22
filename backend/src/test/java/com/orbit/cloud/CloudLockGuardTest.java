package com.orbit.cloud;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.orbit.cloud.entity.CloudScopeType;
import com.orbit.cloud.repository.CloudNodeQueryRepository;
import com.orbit.cloud.repository.CloudNodeRepository;
import com.orbit.cloud.service.CloudNodeMapper;
import com.orbit.cloud.service.CloudNodeService;
import com.orbit.cloud.service.CloudScope;
import com.orbit.common.ApiException;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class CloudLockGuardTest {
    @Test
    void rejectsWritesThroughLockedAncestorAndAllowsUnlockedPath() {
        CloudNodeRepository nodes = mock(CloudNodeRepository.class);
        CloudNodeService service = new CloudNodeService(
            nodes, mock(CloudNodeQueryRepository.class), mock(CloudNodeMapper.class)
        );
        UUID nodeId = UUID.randomUUID();
        CloudScope scope = CloudScope.workspace(UUID.randomUUID());
        when(nodes.hasLockedAncestor(nodeId, CloudScopeType.WORKSPACE.name(), scope.scopeId())).thenReturn(true);

        ApiException locked = assertThrows(ApiException.class, () -> service.requireWritable(scope, nodeId));
        assertEquals(HttpStatus.LOCKED, locked.getStatus());
        assertEquals("RESOURCE_LOCKED", locked.getCode());

        when(nodes.hasLockedAncestor(nodeId, CloudScopeType.WORKSPACE.name(), scope.scopeId())).thenReturn(false);
        when(nodes.hasLockedSubtree(nodeId, CloudScopeType.WORKSPACE.name(), scope.scopeId())).thenReturn(false);
        service.requireWritable(scope, nodeId);
    }
}
