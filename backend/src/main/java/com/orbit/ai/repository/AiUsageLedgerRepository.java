package com.orbit.ai.repository;

import com.orbit.ai.entity.AiUsageLedgerEntity;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AiUsageLedgerRepository extends JpaRepository<AiUsageLedgerEntity, UUID> {

    List<AiUsageLedgerEntity> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(u.costUsd), 0) FROM AiUsageLedgerEntity u WHERE u.userId = :userId AND u.createdAt >= :since")
    BigDecimal sumCostByUserSince(@Param("userId") UUID userId, @Param("since") Instant since);

    @Query("SELECT COALESCE(SUM(u.costUsd), 0) FROM AiUsageLedgerEntity u WHERE u.userId = :userId")
    BigDecimal sumTotalCostByUser(@Param("userId") UUID userId);

    @Query("SELECT COALESCE(SUM(u.inputTokens), 0) FROM AiUsageLedgerEntity u WHERE u.userId = :userId AND u.createdAt >= :since")
    long sumInputTokensByUserSince(@Param("userId") UUID userId, @Param("since") Instant since);

    @Query("SELECT COALESCE(SUM(u.outputTokens), 0) FROM AiUsageLedgerEntity u WHERE u.userId = :userId AND u.createdAt >= :since")
    long sumOutputTokensByUserSince(@Param("userId") UUID userId, @Param("since") Instant since);

    @Query("""
        SELECT u.userId, COALESCE(SUM(u.costUsd), 0), COALESCE(SUM(u.inputTokens + u.outputTokens), 0), COUNT(u)
        FROM AiUsageLedgerEntity u
        WHERE u.createdAt >= :since
        GROUP BY u.userId
        """)
    List<Object[]> summarizeByUserSince(@Param("since") Instant since);

    @Query("""
        SELECT u.userId, u.modelUsed, MAX(u.createdAt)
        FROM AiUsageLedgerEntity u
        WHERE u.createdAt >= :since AND u.modelUsed IS NOT NULL
        GROUP BY u.userId, u.modelUsed
        ORDER BY MAX(u.createdAt) DESC
        """)
    List<Object[]> listModelsByUserSince(@Param("since") Instant since);
}
