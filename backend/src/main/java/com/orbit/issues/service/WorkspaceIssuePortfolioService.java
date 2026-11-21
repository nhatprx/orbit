package com.orbit.issues.service;

import com.orbit.issues.dto.IssueDto;
import com.orbit.issues.dto.ProjectIssueSummaryDto;
import com.orbit.issues.dto.WorkspaceIssuePortfolioDto;
import com.orbit.issues.entity.IssuePriority;
import com.orbit.issues.entity.IssueSprintEntity;
import com.orbit.issues.entity.IssueStatus;
import com.orbit.issues.entity.ProjectIssueEntity;
import com.orbit.issues.entity.SprintStatus;
import com.orbit.issues.repository.IssueSprintRepository;
import com.orbit.issues.repository.ProjectIssueRepository;
import com.orbit.project.entity.ProjectEntity;
import com.orbit.project.repository.ProjectRepository;
import com.orbit.workspace.permission.ProjectPermissionPolicy;
import com.orbit.workspace.permission.WorkspacePermissionEvaluator.WorkspaceAccess;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Aggregates cross-project issue metrics and recent activity for a workspace portfolio. */
@Service
public class WorkspaceIssuePortfolioService {

    public static final int RECENT_ISSUES_LIMIT = 25;

    private final ProjectRepository projects;
    private final ProjectIssueRepository issues;
    private final IssueSprintRepository sprints;
    private final IssueLookupHelper lookup;

    public WorkspaceIssuePortfolioService(
        ProjectRepository projects,
        ProjectIssueRepository issues,
        IssueSprintRepository sprints,
        IssueLookupHelper lookup
    ) {
        this.projects = projects;
        this.issues = issues;
        this.sprints = sprints;
        this.lookup = lookup;
    }

    @Transactional(readOnly = true)
    public WorkspaceIssuePortfolioDto getPortfolio(UUID userId, UUID workspaceId) {
        WorkspaceAccess access = lookup.requireWorkspaceIssuesAccess(userId, workspaceId);
        List<ProjectEntity> visibleProjects = ProjectPermissionPolicy.canSeeAllProjects(access.permissions(), access.owner())
            ? projects.findByWorkspaceIdAndDeletedAtIsNull(workspaceId, Pageable.unpaged()).getContent()
            : projects.findMemberProjects(workspaceId, userId, Pageable.unpaged()).getContent();

        if (visibleProjects.isEmpty()) {
            return new WorkspaceIssuePortfolioDto(workspaceId, 0, 0, 0, 0, 0, 0, List.of(), List.of());
        }

        List<UUID> projectIds = visibleProjects.stream().map(ProjectEntity::getId).toList();
        Map<UUID, String> projectNames = visibleProjects.stream()
            .collect(Collectors.toMap(ProjectEntity::getId, ProjectEntity::getName, (a, b) -> a));

        List<ProjectIssueEntity> allIssues = issues.findByProjectIdInOrderByUpdatedAtDesc(projectIds);
        List<IssueSprintEntity> activeSprints = sprints.findByProjectIdInAndStatus(projectIds, SprintStatus.ACTIVE);

        Map<UUID, List<ProjectIssueEntity>> issuesByProject = allIssues.stream()
            .collect(Collectors.groupingBy(ProjectIssueEntity::getProjectId));
        Map<UUID, String> activeSprintByProject = new HashMap<>();
        for (IssueSprintEntity sprint : activeSprints) {
            activeSprintByProject.putIfAbsent(sprint.getProjectId(), sprint.getName());
        }

        int totalIssues = 0;
        int openIssues = 0;
        int inProgressIssues = 0;
        int doneIssues = 0;
        int criticalIssues = 0;
        List<ProjectIssueSummaryDto> summaries = new ArrayList<>(visibleProjects.size());

        for (ProjectEntity project : visibleProjects) {
            List<ProjectIssueEntity> projectIssues = issuesByProject.getOrDefault(project.getId(), List.of());
            ProjectIssueSummaryDto summary = summarizeProject(
                project, projectIssues, activeSprintByProject.get(project.getId())
            );
            summaries.add(summary);
            totalIssues += summary.totalIssues();
            openIssues += summary.backlogCount() + summary.todoCount();
            inProgressIssues += summary.inProgressCount() + summary.inReviewCount();
            doneIssues += summary.doneCount();
            criticalIssues += summary.criticalCount();
        }

        List<ProjectIssueEntity> recentSlice = allIssues.size() > RECENT_ISSUES_LIMIT
            ? allIssues.subList(0, RECENT_ISSUES_LIMIT)
            : allIssues;
        List<IssueDto> recentDtos = lookup.toIssueDtos(recentSlice, projectNames);

        return new WorkspaceIssuePortfolioDto(
            workspaceId, totalIssues, openIssues, inProgressIssues, doneIssues,
            criticalIssues, activeSprints.size(), summaries, recentDtos
        );
    }

    private static ProjectIssueSummaryDto summarizeProject(
        ProjectEntity project, List<ProjectIssueEntity> projectIssues, String activeSprintName
    ) {
        int backlog = 0;
        int todo = 0;
        int inProgress = 0;
        int inReview = 0;
        int done = 0;
        int critical = 0;
        for (ProjectIssueEntity issue : projectIssues) {
            if (issue.getStatus() == IssueStatus.BACKLOG) backlog++;
            else if (issue.getStatus() == IssueStatus.TODO) todo++;
            else if (issue.getStatus() == IssueStatus.IN_PROGRESS) inProgress++;
            else if (issue.getStatus() == IssueStatus.IN_REVIEW) inReview++;
            else if (issue.getStatus() == IssueStatus.DONE) done++;
            if (issue.getPriority() == IssuePriority.CRITICAL) critical++;
        }
        int total = projectIssues.size();
        int completionPercent = total == 0 ? 0 : (int) Math.round((done * 100.0) / total);
        return new ProjectIssueSummaryDto(
            project.getId(), project.getName(), project.getSlug(),
            total, backlog, todo, inProgress, inReview, done, critical,
            activeSprintName, completionPercent
        );
    }
}
