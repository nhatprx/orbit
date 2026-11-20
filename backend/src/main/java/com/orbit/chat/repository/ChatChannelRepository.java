package com.orbit.chat.repository;

import com.orbit.chat.entity.ChatChannelEntity;
import com.orbit.chat.entity.ChatScopeType;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface ChatChannelRepository extends JpaRepository<ChatChannelEntity, UUID> {

    List<ChatChannelEntity> findByScopeTypeAndScopeIdOrderByCreatedAtAsc(ChatScopeType scopeType, UUID scopeId);

    /** Race-free: concurrent first reads of a scope create exactly one default channel. */
    @Modifying
    @Query(
        value = """
            INSERT INTO chat_channels (id, scope_type, scope_id, name, description, created_at)
            VALUES (:id, :scopeType, :scopeId, 'general', 'Default channel', NOW())
            ON CONFLICT (scope_type, scope_id, name) DO NOTHING
            """,
        nativeQuery = true
    )
    int insertDefaultIfAbsent(UUID id, String scopeType, UUID scopeId);

    @Modifying
    @Query("delete from ChatChannelEntity c where c.scopeType = :scopeType and c.scopeId in :scopeIds")
    int deleteByScope(ChatScopeType scopeType, Collection<UUID> scopeIds);
}
