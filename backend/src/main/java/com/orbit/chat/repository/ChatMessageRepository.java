package com.orbit.chat.repository;

import com.orbit.chat.dto.ChatMessageDto;
import com.orbit.chat.entity.ChatMessageEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, UUID> {

    /** Newest first; callers pass a bounded page size. */
    @Query("""
        select new com.orbit.chat.dto.ChatMessageDto(
            m.id, m.channelId, u.id, u.displayName, u.username, m.content, m.createdAt)
        from ChatMessageEntity m join UserEntity u on u.id = m.senderId
        where m.channelId = :channelId
        order by m.createdAt desc, m.id desc
        """)
    List<ChatMessageDto> findLatest(UUID channelId, Pageable pageable);

    @Query("""
        select new com.orbit.chat.dto.ChatMessageDto(
            m.id, m.channelId, u.id, u.displayName, u.username, m.content, m.createdAt)
        from ChatMessageEntity m join UserEntity u on u.id = m.senderId
        where m.channelId = :channelId
          and (m.createdAt < :createdAt or (m.createdAt = :createdAt and m.id < :id))
        order by m.createdAt desc, m.id desc
        """)
    List<ChatMessageDto> findBefore(UUID channelId, Instant createdAt, UUID id, Pageable pageable);

    long countBySenderId(UUID senderId);

    @Query("select m.createdAt from ChatMessageEntity m where m.senderId = :senderId and m.createdAt >= :since")
    List<Instant> findCreatedAtBySenderIdSince(UUID senderId, Instant since);

    @Query("select max(m.createdAt) from ChatMessageEntity m where m.senderId = :senderId")
    Instant findLatestCreatedAtBySenderId(UUID senderId);
}
