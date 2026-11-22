package com.orbit.collab.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.collab.dto.CollabRoomEvent;
import com.orbit.collab.dto.CollabCatalogEvent;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class CollabRelay implements MessageListener {
    public static final String REDIS_TOPIC = "orbit:collab:events";
    private static final Logger LOG = LoggerFactory.getLogger(CollabRelay.class);
    private final SimpMessagingTemplate messaging;
    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;

    public CollabRelay(SimpMessagingTemplate messaging, StringRedisTemplate redis, ObjectMapper mapper) {
        this.messaging = messaging;
        this.redis = redis;
        this.mapper = mapper;
    }

    public void broadcast(CollabRoomEvent event) {
        try {
            redis.convertAndSend(REDIS_TOPIC, mapper.writeValueAsString(event));
        } catch (Exception ex) {
            LOG.warn("Collaboration relay fell back to local delivery: {}", ex.getMessage());
            deliver(event);
        }
    }

    public void broadcastCatalog(CollabCatalogEvent event) {
        try {
            redis.convertAndSend(REDIS_TOPIC, mapper.writeValueAsString(event));
        } catch (Exception ex) {
            LOG.warn("Collaboration catalog relay fell back to local delivery: {}", ex.getMessage());
            deliverCatalog(event);
        }
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            JsonNode payload = mapper.readTree(message.getBody());
            if ("CATALOG_CHANGED".equals(payload.path("type").asText())) {
                deliverCatalog(mapper.treeToValue(payload, CollabCatalogEvent.class));
            } else {
                deliver(mapper.treeToValue(payload, CollabRoomEvent.class));
            }
        } catch (Exception ex) {
            LOG.warn("Dropping malformed collaboration event: {}", ex.getMessage());
        }
    }

    private void deliver(CollabRoomEvent event) {
        String kind = "WHITEBOARD".equals(event.resourceKind()) ? "whiteboard" : "cloud";
        messaging.convertAndSend("/topic/collab." + kind + "." + event.resourceId(), event);
    }

    private void deliverCatalog(CollabCatalogEvent event) {
        String scope = event.projectId() == null
            ? "/topic/collab.workspace." + event.workspaceId()
            : "/topic/collab.project." + event.projectId();
        messaging.convertAndSend(scope, event);
    }
}
