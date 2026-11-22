package com.orbit.cloud.service;

import com.orbit.cloud.config.CloudProperties;
import com.orbit.cloud.dto.CloudQuotaResponse;
import com.orbit.cloud.entity.CloudStorageQuotaEntity;
import com.orbit.cloud.entity.CloudStorageQuotaId;
import com.orbit.cloud.repository.CloudStorageQuotaRepository;
import com.orbit.common.ApiException;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Race-free quota management combining Redis reservations with PostgreSQL conditional updates. */
@Service
public class CloudQuotaService {

    private static final Logger LOG = LoggerFactory.getLogger(CloudQuotaService.class);

    private final CloudStorageQuotaRepository quotaRepo;
    private final CloudProperties properties;
    private final ObjectProvider<StringRedisTemplate> redisProvider;

    public CloudQuotaService(
        CloudStorageQuotaRepository quotaRepo,
        CloudProperties properties,
        ObjectProvider<StringRedisTemplate> redisProvider
    ) {
        this.quotaRepo = quotaRepo;
        this.properties = properties;
        this.redisProvider = redisProvider;
    }

    @Transactional
    public CloudQuotaResponse getQuota(CloudScope scope) {
        CloudStorageQuotaEntity entity = ensureAndLoad(scope);
        long reserved = readReservedBytes(scope);
        return new CloudQuotaResponse(
            scope.type(),
            scope.scopeId(),
            entity.getUsedBytes(),
            entity.getQuotaBytes(),
            reserved,
            properties.getMaxFileSizeBytes(),
            properties.getMultipartThresholdBytes()
        );
    }

    @Transactional
    public void reserve(CloudScope scope, long bytes) {
        CloudStorageQuotaEntity entity = ensureAndLoad(scope);
        if (bytes <= 0) {
            return;
        }
        StringRedisTemplate redis = redisProvider.getIfAvailable();
        if (redis == null) {
            if (entity.getUsedBytes() + bytes > entity.getQuotaBytes()) {
                throw quotaExceeded();
            }
            return;
        }
        String key = reservationKey(scope);
        try {
            Long newReserved = redis.opsForValue().increment(key, bytes);
            long reservedTotal = newReserved == null ? bytes : newReserved;
            redis.expire(key, Duration.ofMinutes(properties.getUploadSessionTtlMinutes() + 10L));
            if (entity.getUsedBytes() + reservedTotal > entity.getQuotaBytes()) {
                releaseReservation(scope, bytes);
                throw quotaExceeded();
            }
        } catch (DataAccessException ex) {
            LOG.warn("Redis quota reservation unavailable, falling back to DB check: {}", ex.getMessage());
            if (entity.getUsedBytes() + bytes > entity.getQuotaBytes()) {
                throw quotaExceeded();
            }
        }
    }

    public void releaseReservation(CloudScope scope, long bytes) {
        if (bytes <= 0) {
            return;
        }
        StringRedisTemplate redis = redisProvider.getIfAvailable();
        if (redis == null) {
            return;
        }
        String key = reservationKey(scope);
        try {
            Long remaining = redis.opsForValue().decrement(key, bytes);
            if (remaining != null && remaining <= 0L) {
                redis.delete(key);
            }
        } catch (DataAccessException ex) {
            LOG.warn("Failed to release Redis quota reservation for {}: {}", key, ex.getMessage());
        }
    }

    @Transactional
    public void commitUpload(CloudScope scope, long reservedBytes, long actualBytes) {
        releaseReservation(scope, reservedBytes);
        ensureRow(scope);
        if (actualBytes <= 0) {
            return;
        }
        int updated = quotaRepo.tryAddUsedBytes(scope.type().name(), scope.scopeId(), actualBytes);
        if (updated == 0) {
            throw quotaExceeded();
        }
    }

    @Transactional
    public void releaseUsedBytes(CloudScope scope, long freedBytes) {
        if (freedBytes <= 0) {
            return;
        }
        quotaRepo.subtractUsedBytes(scope.type().name(), scope.scopeId(), freedBytes);
    }

    @Transactional
    public void adjustUsedBytes(CloudScope scope, long deltaBytes) {
        if (deltaBytes == 0L) {
            return;
        }
        ensureRow(scope);
        if (deltaBytes > 0L) {
            int updated = quotaRepo.tryAddUsedBytes(scope.type().name(), scope.scopeId(), deltaBytes);
            if (updated == 0) {
                throw ApiException.badRequest("QUOTA_EXCEEDED", "Storage quota exceeded for this scope.");
            }
        } else {
            quotaRepo.subtractUsedBytes(scope.type().name(), scope.scopeId(), -deltaBytes);
        }
    }

    @Transactional
    public void transferUsedBytes(CloudScope sourceScope, CloudScope targetScope, long bytes) {
        if (bytes <= 0L || sourceScope.equals(targetScope)) return;
        CloudStorageQuotaEntity target = ensureAndLoad(targetScope);
        if (target.getUsedBytes() + readReservedBytes(targetScope) + bytes > target.getQuotaBytes()) {
            throw quotaExceeded();
        }
        if (quotaRepo.tryAddUsedBytes(targetScope.type().name(), targetScope.scopeId(), bytes) == 0) {
            throw quotaExceeded();
        }
        quotaRepo.subtractUsedBytes(sourceScope.type().name(), sourceScope.scopeId(), bytes);
    }

    private CloudStorageQuotaEntity ensureAndLoad(CloudScope scope) {
        ensureRow(scope);
        return quotaRepo.findById(new CloudStorageQuotaId(scope.type(), scope.scopeId()))
            .orElseGet(() -> new CloudStorageQuotaEntity(
                scope.type(), scope.scopeId(), properties.defaultQuotaFor(scope.type())
            ));
    }

    private void ensureRow(CloudScope scope) {
        quotaRepo.ensureRow(scope.type().name(), scope.scopeId(), properties.defaultQuotaFor(scope.type()));
    }

    private long readReservedBytes(CloudScope scope) {
        StringRedisTemplate redis = redisProvider.getIfAvailable();
        if (redis == null) {
            return 0L;
        }
        try {
            String raw = redis.opsForValue().get(reservationKey(scope));
            if (raw == null || raw.isBlank()) {
                return 0L;
            }
            return Math.max(0L, Long.parseLong(raw));
        } catch (RuntimeException ex) {
            return 0L;
        }
    }

    static String reservationKey(CloudScope scope) {
        return "orbit:cloud:quota:res:" + scope.type().name() + ":" + scope.scopeId();
    }

    private static ApiException quotaExceeded() {
        return new ApiException(
            HttpStatus.PAYLOAD_TOO_LARGE,
            "QUOTA_EXCEEDED",
            "Storage quota exceeded for this scope."
        );
    }
}
