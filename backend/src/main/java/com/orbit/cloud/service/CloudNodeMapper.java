package com.orbit.cloud.service;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.cloud.dto.CloudNodeResponse;
import com.orbit.cloud.entity.CloudNodeEntity;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/** Maps CloudNodeEntity instances to DTOs with batched user display-name resolution (zero N+1). */
@Component
public class CloudNodeMapper {

    private final UserRepository userRepository;

    public CloudNodeMapper(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public CloudNodeResponse toResponse(CloudNodeEntity node) {
        String name = userRepository.findById(node.getCreatedBy())
            .map(UserEntity::getDisplayName)
            .orElse("Unknown");
        return toResponse(node, name);
    }

    public List<CloudNodeResponse> toResponses(Collection<CloudNodeEntity> nodes) {
        if (nodes.isEmpty()) {
            return List.of();
        }
        Set<UUID> creatorIds = nodes.stream()
            .map(CloudNodeEntity::getCreatedBy)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
        Map<UUID, String> names = userRepository.findAllById(creatorIds).stream()
            .collect(Collectors.toMap(UserEntity::getId, UserEntity::getDisplayName, (a, b) -> a));
        return nodes.stream()
            .map(n -> toResponse(n, names.getOrDefault(n.getCreatedBy(), "Unknown")))
            .toList();
    }

    private static CloudNodeResponse toResponse(CloudNodeEntity n, String createdByName) {
        return new CloudNodeResponse(
            n.getId(),
            n.getScopeType(),
            n.getScopeId(),
            n.getParentId(),
            n.getNodeType(),
            n.getName(),
            n.getMimeType(),
            n.getSizeBytes(),
            n.isStarred(),
            n.getDepth(),
            n.getCreatedBy(),
            createdByName,
            n.getDeletedAt(),
            n.getPurgeAfter(),
            n.getCreatedAt(),
            n.getUpdatedAt()
        );
    }
}
