package com.orbit.git.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.git.dto.GitCollaborationDtos.*;
import com.orbit.git.service.GitAccessGuard;
import com.orbit.git.service.GitCollaborationService;
import com.orbit.git.service.GitScope;
import com.orbit.workspace.permission.Permissions;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** REST endpoints for PR detail/reviews, CI/CD jobs/re-runs, branch comparison, and Git AI analysis. */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}")
public class GitCollaborationController {

    private final GitAccessGuard guard;
    private final GitCollaborationService collab;

    public GitCollaborationController(GitAccessGuard guard, GitCollaborationService collab) {
        this.guard = guard;
        this.collab = collab;
    }

    private GitScope wsRead(AuthenticatedUserPrincipal p, UUID wsId) {
        return guard.requireWorkspaceScope(p.userId(), wsId, Permissions.GIT_READ);
    }

    private GitScope wsWrite(AuthenticatedUserPrincipal p, UUID wsId) {
        return guard.requireWorkspaceScope(p.userId(), wsId, Permissions.GIT_WRITE);
    }

    private GitScope projRead(AuthenticatedUserPrincipal p, UUID wsId, UUID projId) {
        return guard.requireProjectScope(p.userId(), wsId, projId, Permissions.PGIT_READ);
    }

    private GitScope projWrite(AuthenticatedUserPrincipal p, UUID wsId, UUID projId) {
        return guard.requireProjectScope(p.userId(), wsId, projId, Permissions.PGIT_WRITE);
    }

    @GetMapping("/git/pulls/{pullNumber}")
    public GitPrDetailDto wsPrDetail(@AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable int pullNumber) {
        return collab.getPullRequestDetail(wsRead(p, workspaceId), pullNumber);
    }

    @PostMapping("/git/pulls/{pullNumber}/reviews")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void wsPrReview(@AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable int pullNumber, @RequestBody GitPrReviewRequest req) {
        collab.submitPullRequestReview(wsWrite(p, workspaceId), pullNumber, req);
    }

    @PostMapping("/git/pulls/{pullNumber}/ai-review")
    public GitAiAnalysisDto wsPrAiReview(@AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable int pullNumber) {
        return collab.aiReviewPullRequest(p.userId(), wsRead(p, workspaceId), pullNumber);
    }

    @GetMapping("/git/actions/{runId}/jobs")
    public List<GitWorkflowJobDto> wsActionJobs(@AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable long runId) {
        return collab.listWorkflowJobs(wsRead(p, workspaceId), runId);
    }

    @PostMapping("/git/actions/{runId}/rerun")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void wsActionRerun(@AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable long runId, @RequestParam(defaultValue = "true") boolean failedOnly) {
        collab.rerunWorkflow(wsWrite(p, workspaceId), runId, failedOnly);
    }

    @PostMapping("/git/actions/{runId}/ai-explain")
    public GitAiAnalysisDto wsActionAiExplain(@AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable long runId) {
        return collab.aiExplainWorkflowFailure(p.userId(), wsRead(p, workspaceId), runId);
    }

    @GetMapping("/git/compare")
    public GitBranchCompareDto wsCompare(@AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @RequestParam String base, @RequestParam String head) {
        return collab.compareBranches(wsRead(p, workspaceId), base, head);
    }

    @GetMapping("/projects/{projectId}/git/pulls/{pullNumber}")
    public GitPrDetailDto projPrDetail(@AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable UUID projectId, @PathVariable int pullNumber) {
        return collab.getPullRequestDetail(projRead(p, workspaceId, projectId), pullNumber);
    }

    @PostMapping("/projects/{projectId}/git/pulls/{pullNumber}/reviews")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void projPrReview(@AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable UUID projectId, @PathVariable int pullNumber, @RequestBody GitPrReviewRequest req) {
        collab.submitPullRequestReview(projWrite(p, workspaceId, projectId), pullNumber, req);
    }

    @PostMapping("/projects/{projectId}/git/pulls/{pullNumber}/ai-review")
    public GitAiAnalysisDto projPrAiReview(@AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable UUID projectId, @PathVariable int pullNumber) {
        return collab.aiReviewPullRequest(p.userId(), projRead(p, workspaceId, projectId), pullNumber);
    }

    @GetMapping("/projects/{projectId}/git/actions/{runId}/jobs")
    public List<GitWorkflowJobDto> projActionJobs(@AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable UUID projectId, @PathVariable long runId) {
        return collab.listWorkflowJobs(projRead(p, workspaceId, projectId), runId);
    }

    @PostMapping("/projects/{projectId}/git/actions/{runId}/rerun")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void projActionRerun(@AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable UUID projectId, @PathVariable long runId, @RequestParam(defaultValue = "true") boolean failedOnly) {
        collab.rerunWorkflow(projWrite(p, workspaceId, projectId), runId, failedOnly);
    }

    @PostMapping("/projects/{projectId}/git/actions/{runId}/ai-explain")
    public GitAiAnalysisDto projActionAiExplain(@AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable UUID projectId, @PathVariable long runId) {
        return collab.aiExplainWorkflowFailure(p.userId(), projRead(p, workspaceId, projectId), runId);
    }

    @GetMapping("/projects/{projectId}/git/compare")
    public GitBranchCompareDto projCompare(@AuthenticationPrincipal AuthenticatedUserPrincipal p, @PathVariable UUID workspaceId, @PathVariable UUID projectId, @RequestParam String base, @RequestParam String head) {
        return collab.compareBranches(projRead(p, workspaceId, projectId), base, head);
    }
}
