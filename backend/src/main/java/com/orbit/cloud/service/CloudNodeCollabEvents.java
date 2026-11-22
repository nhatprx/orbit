package com.orbit.cloud.service;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.entity.CloudNodeType;
import com.orbit.cloud.repository.CloudNodeRepository;
import com.orbit.collab.dto.CollabCatalogEvent;
import com.orbit.collab.dto.CollabRoomEvent;
import com.orbit.collab.service.CollabRelay;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;

@Component
public class CloudNodeCollabEvents {
    private final CloudNodeRepository nodeRepository;
    private CollabRelay relay;

    public CloudNodeCollabEvents(CloudNodeRepository nodeRepository) {
        this.nodeRepository = nodeRepository;
    }

    @Autowired(required = false)
    void setRelay(CollabRelay value) { this.relay = value; }

    public void catalogChanged(CloudScope scope, String action, UUID resourceId, Boolean locked) {
        if (relay == null || scope.type() == com.orbit.cloud.entity.CloudScopeType.USER) return;
        relay.broadcastCatalog(new CollabCatalogEvent(
            "CATALOG_CHANGED", "cloud", action, resourceId, locked, scope.workspaceId(), scope.projectId()
        ));
    }

    public void checkpoint(CloudScope scope, UUID nodeId, UUID actorId, Instant updatedAt) {
        if (relay == null) return;
        var payload = JsonNodeFactory.instance.objectNode().put("updatedAt", updatedAt.toString());
        relay.broadcast(new CollabRoomEvent("SAVED_CHECKPOINT", "CLOUD_NODE", nodeId,
            actorId, null, null, 0, updatedAt, null, payload));
        catalogChanged(scope, "UPDATE", nodeId, null);
    }

    public void lockChanged(CloudScope scope, CloudNodeEntity root, UUID actorId, boolean locked) {
        if (relay == null) return;
        catalogChanged(scope, "LOCK", root.getId(), locked);
        List<UUID> ids = root.getNodeType() == CloudNodeType.FOLDER
            ? nodeRepository.findSubtreeIds(root.getId(), scope.type().name(), scope.scopeId())
            : List.of(root.getId());
        var payload = JsonNodeFactory.instance.objectNode().put("locked", locked);
        for (UUID id : ids) relay.broadcast(new CollabRoomEvent(
            "LOCK_CHANGED", "CLOUD_NODE", id, actorId, null, null, 0, Instant.now(), null, payload
        ));
    }
}
