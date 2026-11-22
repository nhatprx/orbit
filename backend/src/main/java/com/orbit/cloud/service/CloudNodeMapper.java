package com.orbit.cloud.service;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.cloud.dto.CloudNodeResponse;
import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.repository.CloudNodeRepository;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/** Maps CloudNodeEntity instances to DTOs with batched user-name and folder-path resolution (zero N+1). */
@Component
public class CloudNodeMapper {

    private final UserRepository userRepository;
    private final CloudNodeRepository nodeRepository;

    public CloudNodeMapper(UserRepository userRepository, CloudNodeRepository nodeRepository) {
        this.userRepository = userRepository;
        this.nodeRepository = nodeRepository;
    }

    public CloudNodeResponse toResponse(CloudNodeEntity node) {
        String name = userRepository.findById(node.getCreatedBy())
            .map(UserEntity::getDisplayName)
            .orElse("Unknown");
        String folderPath = node.getParentId() == null
            ? "/"
            : resolveFolderPaths(Set.of(node.getParentId())).getOrDefault(node.getParentId(), "/");
        return toResponse(node, name, folderPath);
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

        Set<UUID> parentIds = nodes.stream()
            .map(CloudNodeEntity::getParentId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
        Map<UUID, String> folderPaths = resolveFolderPaths(parentIds);

        return nodes.stream()
            .map(n -> toResponse(
                n,
                names.getOrDefault(n.getCreatedBy(), "Unknown"),
                n.getParentId() == null ? "/" : folderPaths.getOrDefault(n.getParentId(), "/")
            ))
            .toList();
    }

    private Map<UUID, String> resolveFolderPaths(Set<UUID> parentIds) {
        if (parentIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> rows = nodeRepository.findAncestorPathRows(parentIds);
        if (rows == null || rows.isEmpty()) {
            return Map.of();
        }
        Map<UUID, List<String>> segmentsByLeaf = new LinkedHashMap<>();
        for (Object[] row : rows) {
            UUID leafId = row[0] instanceof UUID u ? u : UUID.fromString(row[0].toString());
            String segment = row[1] == null ? "" : row[1].toString();
            segmentsByLeaf.computeIfAbsent(leafId, k -> new ArrayList<>()).add(segment);
        }
        Map<UUID, String> paths = new HashMap<>(segmentsByLeaf.size());
        for (Map.Entry<UUID, List<String>> entry : segmentsByLeaf.entrySet()) {
            paths.put(entry.getKey(), "/" + String.join("/", entry.getValue()));
        }
        return paths;
    }

    private static CloudNodeResponse toResponse(CloudNodeEntity n, String createdByName, String folderPath) {
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
            n.getUpdatedAt(),
            folderPath
        );
    }
}
