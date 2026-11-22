package com.orbit.chat.repository;

import com.orbit.chat.entity.ChatMessageReactionEntity;
import java.util.UUID;
import java.util.List;
import com.orbit.chat.dto.ChatReactionSummaryDto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Modifying;

public interface ChatMessageReactionRepository extends JpaRepository<ChatMessageReactionEntity, UUID> {
    boolean existsByMessageIdAndUserIdAndReactionKey(UUID messageId, UUID userId, String reactionKey);
    long countByMessageIdAndReactionKey(UUID messageId, String reactionKey);
    void deleteByMessageIdAndUserIdAndReactionKey(UUID messageId, UUID userId, String reactionKey);

    @Modifying
    @Query(value = "insert into chat_message_reactions (id, message_id, user_id, reaction_key, created_at) "
        + "values (:id, :messageId, :userId, :reactionKey, now()) on conflict (message_id, user_id, reaction_key) do nothing",
        nativeQuery = true)
    int insertIfAbsent(@Param("id") UUID id, @Param("messageId") UUID messageId,
        @Param("userId") UUID userId, @Param("reactionKey") String reactionKey);

    @Query("""
        select new com.orbit.chat.dto.ChatReactionSummaryDto(r.messageId, r.reactionKey, count(r),
            sum(case when r.userId = :userId then 1 else 0 end) > 0)
        from ChatMessageReactionEntity r where r.messageId in :messageIds
        group by r.messageId, r.reactionKey
        """)
    List<ChatReactionSummaryDto> findSummaries(@Param("messageIds") List<UUID> messageIds,
        @Param("userId") UUID userId);

    @Query("select r.messageId, r.reactionKey, count(r) from ChatMessageReactionEntity r "
        + "where r.messageId in :messageIds group by r.messageId, r.reactionKey")
    List<Object[]> findSummaryCounts(@Param("messageIds") List<UUID> messageIds);

    @Query("select distinct r.messageId, r.reactionKey from ChatMessageReactionEntity r "
        + "where r.messageId in :messageIds and r.userId = :userId")
    List<Object[]> findUserReactions(@Param("messageIds") List<UUID> messageIds, @Param("userId") UUID userId);
}
