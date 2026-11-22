package com.orbit.whiteboard.service;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.orbit.collab.dto.CollabCatalogEvent;
import com.orbit.collab.dto.CollabRoomEvent;
import com.orbit.collab.service.CollabRelay;
import com.orbit.common.Timestamps;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class WhiteboardCollabEvents {
    private final CollabRelay relay;

    public WhiteboardCollabEvents(CollabRelay relay) { this.relay = relay; }

    public void catalog(WhiteboardScope scope, String action, UUID id, Boolean locked) {
        relay.broadcastCatalog(new CollabCatalogEvent(
            "CATALOG_CHANGED", "whiteboard", action, id, locked, scope.workspaceId(), scope.projectId()
        ));
    }

    public void checkpoint(WhiteboardScope scope, UUID id, UUID actorId, long version, String updatedAt) {
        var payload = JsonNodeFactory.instance.objectNode().put("version", version).put("updatedAt", updatedAt);
        room("SAVED_CHECKPOINT", scope, id, actorId, payload);
    }

    public void lockChanged(WhiteboardScope scope, UUID id, UUID actorId, boolean locked) {
        var payload = JsonNodeFactory.instance.objectNode().put("locked", locked);
        room("LOCK_CHANGED", scope, id, actorId, payload);
    }

    public void assetReady(WhiteboardScope scope, UUID id, UUID actorId, String fileId) {
        var payload = JsonNodeFactory.instance.objectNode().put("fileId", fileId);
        room("ASSET_READY", scope, id, actorId, payload);
    }

    private void room(String type, WhiteboardScope scope, UUID id, UUID actorId,
                      com.fasterxml.jackson.databind.JsonNode payload) {
        relay.broadcast(new CollabRoomEvent(type, "WHITEBOARD", id, actorId, null, null,
            0, Timestamps.now(), null, payload));
    }
}
