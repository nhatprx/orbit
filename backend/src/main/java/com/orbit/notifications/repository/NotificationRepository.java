package com.orbit.notifications.repository;

import com.orbit.notifications.entity.NotificationEntity;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface NotificationRepository extends JpaRepository<NotificationEntity, UUID> {
    Page<NotificationEntity> findByRecipientIdOrderByCreatedAtDesc(UUID recipientId, Pageable pageable);
    long countByRecipientIdAndReadAtIsNull(UUID recipientId);
    Optional<NotificationEntity> findByIdAndRecipientId(UUID id, UUID recipientId);

    @Modifying
    @Query("update NotificationEntity n set n.readAt = :readAt where n.recipientId = :recipientId and n.readAt is null")
    int markAllRead(UUID recipientId, Instant readAt);
}
