package com.orbit.issues.service;

import com.orbit.common.ApiException;
import com.orbit.issues.dto.CreateIssueCommentRequest;
import com.orbit.issues.dto.IssueCommentDto;
import com.orbit.issues.entity.IssueCommentEntity;
import com.orbit.issues.repository.IssueActivityRepository;
import com.orbit.issues.repository.IssueCommentRepository;
import com.orbit.issues.repository.ProjectIssueRepository;
import com.orbit.workspace.permission.Permissions;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator.ProjectAccess;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Manages issue comments with RBAC authorization and activity recording. */
@Service
public class IssueCommentService {

    private static final int ACTIVITY_PREVIEW_LIMIT = 80;

    private final ProjectIssueRepository issues;
    private final IssueCommentRepository comments;
    private final IssueActivityRepository activities;
    private final IssueLookupHelper lookup;

    public IssueCommentService(
        ProjectIssueRepository issues,
        IssueCommentRepository comments,
        IssueActivityRepository activities,
        IssueLookupHelper lookup
    ) {
        this.issues = issues;
        this.comments = comments;
        this.activities = activities;
        this.lookup = lookup;
    }

    @Transactional
    public IssueCommentDto addComment(
        UUID userId, UUID workspaceId, UUID projectId, UUID issueId, CreateIssueCommentRequest request
    ) {
        lookup.requireProjectPermission(userId, workspaceId, projectId, Permissions.PISSUES_WRITE);
        issues.findByIdAndProjectId(issueId, projectId)
            .orElseThrow(() -> ApiException.notFound("ISSUE_NOT_FOUND", "Issue not found."));
        String body = IssueValidationHelper.validateCommentBody(request.body());

        IssueCommentEntity entity = new IssueCommentEntity();
        entity.setIssueId(issueId);
        entity.setAuthorId(userId);
        entity.setBody(body);
        IssueCommentEntity saved = comments.save(entity);

        activities.save(IssueValidationHelper.newActivity(
            issueId, userId, "COMMENT_ADDED", "comment", null,
            IssueValidationHelper.truncate(body, ACTIVITY_PREVIEW_LIMIT)
        ));

        Map<UUID, String> names = lookup.resolveUserNames(List.of(userId));
        return new IssueCommentDto(
            saved.getId(), saved.getIssueId(), saved.getAuthorId(),
            names.getOrDefault(userId, "Unknown"),
            saved.getBody(), saved.getCreatedAt(), saved.getUpdatedAt()
        );
    }

    @Transactional
    public void deleteComment(UUID userId, UUID workspaceId, UUID projectId, UUID issueId, UUID commentId) {
        ProjectAccess access = lookup.requireProjectAccessWithModule(userId, workspaceId, projectId);
        issues.findByIdAndProjectId(issueId, projectId)
            .orElseThrow(() -> ApiException.notFound("ISSUE_NOT_FOUND", "Issue not found."));
        IssueCommentEntity comment = comments.findByIdAndIssueId(commentId, issueId)
            .orElseThrow(() -> ApiException.notFound("COMMENT_NOT_FOUND", "Comment not found."));

        Set<String> perms = access.permissions();
        boolean canManage = perms.contains(Permissions.PISSUES_MANAGE);
        boolean isAuthorWithWrite = userId.equals(comment.getAuthorId()) && perms.contains(Permissions.PISSUES_WRITE);
        if (!canManage && !isAuthorWithWrite) {
            throw ApiException.forbidden("FORBIDDEN", "You do not have permission to delete this comment.");
        }
        comments.delete(comment);
    }
}
