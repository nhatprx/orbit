package com.orbit.issues.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.issues.dto.CreateIssueCommentRequest;
import com.orbit.issues.dto.CreateIssueRequest;
import com.orbit.issues.dto.IssueCommentDto;
import com.orbit.issues.dto.IssueDetailDto;
import com.orbit.issues.dto.IssueDto;
import com.orbit.issues.dto.UpdateIssueRequest;
import com.orbit.issues.service.IssueCommentService;
import com.orbit.issues.service.IssueService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/projects/{projectId}/issues")
public class ProjectIssueController {

    private final IssueService issues;
    private final IssueCommentService comments;

    public ProjectIssueController(IssueService issues, IssueCommentService comments) {
        this.issues = issues;
        this.comments = comments;
    }

    @GetMapping
    public List<IssueDto> list(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @RequestParam(required = false) String type,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String priority,
        @RequestParam(required = false) UUID sprintId,
        @RequestParam(required = false) Boolean backlogOnly,
        @RequestParam(required = false) UUID parentId,
        @RequestParam(required = false) UUID assigneeId,
        @RequestParam(required = false) String q
    ) {
        return issues.listIssues(
            principal.userId(), workspaceId, projectId,
            type, status, priority, sprintId, backlogOnly, parentId, assigneeId, q
        );
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public IssueDto create(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @Valid @RequestBody CreateIssueRequest request
    ) {
        return issues.createIssue(principal.userId(), workspaceId, projectId, request);
    }

    @GetMapping("/{issueId}")
    public IssueDetailDto getDetail(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID issueId
    ) {
        return issues.getIssueDetail(principal.userId(), workspaceId, projectId, issueId);
    }

    @PatchMapping("/{issueId}")
    public IssueDto update(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID issueId,
        @Valid @RequestBody UpdateIssueRequest request
    ) {
        return issues.updateIssue(principal.userId(), workspaceId, projectId, issueId, request);
    }

    @DeleteMapping("/{issueId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID issueId
    ) {
        issues.deleteIssue(principal.userId(), workspaceId, projectId, issueId);
    }

    @PostMapping("/{issueId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public IssueCommentDto addComment(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID issueId,
        @Valid @RequestBody CreateIssueCommentRequest request
    ) {
        return comments.addComment(principal.userId(), workspaceId, projectId, issueId, request);
    }

    @DeleteMapping("/{issueId}/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID issueId,
        @PathVariable UUID commentId
    ) {
        comments.deleteComment(principal.userId(), workspaceId, projectId, issueId, commentId);
    }
}
