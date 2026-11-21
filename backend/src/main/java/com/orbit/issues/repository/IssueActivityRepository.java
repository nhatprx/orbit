package com.orbit.issues.repository;

import com.orbit.issues.entity.IssueActivityEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IssueActivityRepository extends JpaRepository<IssueActivityEntity, UUID> {

    List<IssueActivityEntity> findByIssueIdOrderByCreatedAtDesc(UUID issueId);
}
