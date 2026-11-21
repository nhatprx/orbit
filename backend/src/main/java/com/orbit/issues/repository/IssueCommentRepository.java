package com.orbit.issues.repository;

import com.orbit.issues.entity.IssueCommentEntity;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface IssueCommentRepository extends JpaRepository<IssueCommentEntity, UUID> {

    List<IssueCommentEntity> findByIssueIdOrderByCreatedAtAsc(UUID issueId);

    Optional<IssueCommentEntity> findByIdAndIssueId(UUID id, UUID issueId);

    long countByIssueId(UUID issueId);

    List<IssueCommentEntity> findByIssueIdIn(Collection<UUID> issueIds);

    @Query("SELECT c.issueId, COUNT(c) FROM IssueCommentEntity c WHERE c.issueId IN :issueIds GROUP BY c.issueId")
    List<Object[]> countByIssueIds(@Param("issueIds") Collection<UUID> issueIds);
}
