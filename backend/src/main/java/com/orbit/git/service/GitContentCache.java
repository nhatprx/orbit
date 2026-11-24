package com.orbit.git.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.git.dto.GitFileContentDto;
import com.orbit.git.dto.GitTreeEntryDto;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/** Short-lived Redis cache for GitHub repository trees and file contents to deliver IDE-grade browsing speed. */
@Service
public class GitContentCache {

    private static final Logger log = LoggerFactory.getLogger(GitContentCache.class);
    private static final String PREFIX = "orbit:git:content:";
    private static final Duration TREE_TTL = Duration.ofSeconds(60);
    private static final Duration FILE_TTL = Duration.ofSeconds(120);
    private static final TypeReference<List<GitTreeEntryDto>> TREE_LIST_TYPE = new TypeReference<>() {};

    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;
    private final ConcurrentHashMap<String, String> versionFallback = new ConcurrentHashMap<>();

    @Autowired
    public GitContentCache(StringRedisTemplate redis, ObjectMapper mapper) {
        this.redis = redis;
        this.mapper = mapper;
    }

    public Optional<List<GitTreeEntryDto>> getFullTree(UUID repoId, String branch) {
        return readJson(treeKey(repoId, branch, "full"), TREE_LIST_TYPE);
    }

    public void putFullTree(UUID repoId, String branch, List<GitTreeEntryDto> entries) {
        writeJson(treeKey(repoId, branch, "full"), entries, TREE_TTL);
    }

    public Optional<List<GitTreeEntryDto>> getDirectory(UUID repoId, String branch, String path) {
        return readJson(treeKey(repoId, branch, "dir:" + path), TREE_LIST_TYPE);
    }

    public void putDirectory(UUID repoId, String branch, String path, List<GitTreeEntryDto> entries) {
        writeJson(treeKey(repoId, branch, "dir:" + path), entries, TREE_TTL);
    }

    public Optional<GitFileContentDto> getFile(UUID repoId, String branch, String path) {
        return readJson(fileKey(repoId, branch, path), GitFileContentDto.class);
    }

    public void putFile(UUID repoId, String branch, String path, GitFileContentDto file) {
        writeJson(fileKey(repoId, branch, path), file, FILE_TTL);
    }

    public void evictBranch(UUID repoId, String branch) {
        String verKey = versionKey(repoId, branch);
        String next = String.valueOf(System.currentTimeMillis());
        versionFallback.put(verKey, next);
        if (redis == null) return;
        try {
            redis.opsForValue().set(verKey, next, Duration.ofHours(6));
        } catch (Exception ex) {
            log.debug("Redis unavailable during Git content cache eviction: {}", ex.getMessage());
        }
    }

    private String branchVersion(UUID repoId, String branch) {
        String verKey = versionKey(repoId, branch);
        if (redis != null) {
            try {
                String v = redis.opsForValue().get(verKey);
                if (v != null) return v;
            } catch (Exception ex) {
                log.debug("Redis unavailable reading Git cache version: {}", ex.getMessage());
            }
        }
        return versionFallback.getOrDefault(verKey, "0");
    }

    private String versionKey(UUID repoId, String branch) {
        return PREFIX + "ver:" + repoId + ":" + branch;
    }

    private String treeKey(UUID repoId, String branch, String suffix) {
        return PREFIX + "tree:" + repoId + ":" + branch + ":" + branchVersion(repoId, branch) + ":" + suffix;
    }

    private String fileKey(UUID repoId, String branch, String path) {
        return PREFIX + "file:" + repoId + ":" + branch + ":" + branchVersion(repoId, branch) + ":" + path;
    }

    private <T> Optional<T> readJson(String key, Class<T> type) {
        String raw = getRaw(key);
        if (raw == null) return Optional.empty();
        try {
            return Optional.of(mapper.readValue(raw, type));
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    private <T> Optional<T> readJson(String key, TypeReference<T> typeRef) {
        String raw = getRaw(key);
        if (raw == null) return Optional.empty();
        try {
            return Optional.of(mapper.readValue(raw, typeRef));
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    private String getRaw(String key) {
        if (redis == null) return null;
        try {
            return redis.opsForValue().get(key);
        } catch (Exception ex) {
            log.debug("Redis read skipped for {}: {}", key, ex.getMessage());
            return null;
        }
    }

    private void writeJson(String key, Object value, Duration ttl) {
        if (redis == null || value == null) return;
        try {
            redis.opsForValue().set(key, mapper.writeValueAsString(value), ttl);
        } catch (Exception ex) {
            log.debug("Redis write skipped for {}: {}", key, ex.getMessage());
        }
    }
}
