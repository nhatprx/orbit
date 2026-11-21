package com.orbit.issues.repository;

import com.orbit.issues.entity.ProjectIssueCounterEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectIssueCounterRepository extends JpaRepository<ProjectIssueCounterEntity, UUID> {

    @Query(
        value = """
            INSERT INTO project_issue_counters (project_id, last_issue_number, updated_at)
            VALUES (:projectId, 1, NOW())
            ON CONFLICT (project_id) DO UPDATE
            SET last_issue_number = project_issue_counters.last_issue_number + 1,
                updated_at = NOW()
            RETURNING last_issue_number
            """,
        nativeQuery = true
    )
    int incrementAndGet(@Param("projectId") UUID projectId);
}
