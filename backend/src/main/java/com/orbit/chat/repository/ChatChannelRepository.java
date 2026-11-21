package com.orbit.chat.repository;

import com.orbit.chat.entity.ChatChannelEntity;
import com.orbit.chat.entity.ChatChannelType;
import com.orbit.chat.entity.ChatScopeType;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface ChatChannelRepository extends JpaRepository<ChatChannelEntity, UUID> {

    List<ChatChannelEntity> findByScopeTypeAndScopeIdOrderByCreatedAtAsc(ChatScopeType scopeType, UUID scopeId);

    List<ChatChannelEntity> findByScopeTypeAndScopeIdIn(ChatScopeType scopeType, Collection<UUID> scopeIds);

    boolean existsByScopeTypeAndScopeIdAndChannelType(
        ChatScopeType scopeType, UUID scopeId, ChatChannelType channelType
    );

    boolean existsByScopeTypeAndScopeIdAndNameIgnoreCase(
        ChatScopeType scopeType, UUID scopeId, String name
    );

    boolean existsByScopeTypeAndScopeIdAndNameIgnoreCaseAndIdNot(
        ChatScopeType scopeType, UUID scopeId, String name, UUID id
    );

    /** Race-free: concurrent first reads of a scope create exactly one default text channel. */
    @Modifying
    @Query(
        value = """
            INSERT INTO chat_channels (
                id, scope_type, scope_id, name, description, channel_type, category, created_at
            )
            VALUES (
                :id, :scopeType, :scopeId, 'general', 'Default channel', 'TEXT', 'TEXT CHANNELS', NOW()
            )
            ON CONFLICT (scope_type, scope_id, name) DO NOTHING
            """,
        nativeQuery = true
    )
    int insertDefaultIfAbsent(UUID id, String scopeType, UUID scopeId);

    /** Race-free: seeds the default voice room when requested for a scope with no voice channel. */
    @Modifying
    @Query(
        value = """
            INSERT INTO chat_channels (
                id, scope_type, scope_id, name, description, channel_type, category, created_at
            )
            VALUES (
                :id, :scopeType, :scopeId, 'lounge', 'Voice and screen sharing room',
                'VOICE', 'VOICE CHANNELS', NOW()
            )
            ON CONFLICT (scope_type, scope_id, name) DO NOTHING
            """,
        nativeQuery = true
    )
    int insertDefaultVoiceIfAbsent(UUID id, String scopeType, UUID scopeId);

    @Modifying
    @Query("delete from ChatChannelEntity c where c.scopeType = :scopeType and c.scopeId in :scopeIds")
    int deleteByScope(ChatScopeType scopeType, Collection<UUID> scopeIds);
}
