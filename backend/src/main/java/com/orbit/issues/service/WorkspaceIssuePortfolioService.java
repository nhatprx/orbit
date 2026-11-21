package com.orbit.issues.service;

import com.orbit.issues.dto.IssueDto;
import com.orbit.issues.dto.ProjectIssueSummaryDto;
import com.orbit.issues.dto.WorkspaceIssuePortfolioDto;
import com.orbit.issues.entity.IssueSprintEntity;
import com.orbit.issues.entity.ProjectIssueEntity;
import com.orbit.issues.entity.SprintStatus;
import com.orbit.issues.repository.IssueSprintRepository;
import com.orbit.issues.repository.OffsetLimitPageRequest;
import com.orbit.issues.repository.ProjectIssueAggregate;
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
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Aggregates cross-project issue metrics and recent activity for authorized portfolio projects. */
@Service
public class WorkspaceIssuePortfolioService {

    public static final int RECENT_ISSUES_LIMIT = 25;
    private static final Sort PROJECT_NAME_ASC = Sort.by(Sort.Direction.ASC, "name");

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
    public WorkspaceIssuePortfolioDto getPortfolio(UUID userId, UUID workspaceId, Integer limit, Integer offset) {
        WorkspaceAccess access = lookup.requireWorkspaceIssuesAccess(userId, workspaceId);
        OffsetLimitPageRequest pageRequest = OffsetLimitPageRequest.of(offset, limit, PROJECT_NAME_ASC);

        List<ProjectEntity> candidateProjects = ProjectPermissionPolicy.canSeeAllProjects(access.permissions(), access.owner())
            ? projects.findByWorkspaceIdAndDeletedAtIsNull(workspaceId, pageRequest).getContent()
            : projects.findMemberProjects(workspaceId, userId, pageRequest).getContent();

        List<ProjectEntity> visibleProjects = lookup.filterReadableIssueProjects(userId, access, candidateProjects);
        if (visibleProjects.isEmpty()) {
            return new WorkspaceIssuePortfolioDto(workspaceId, 0, 0, 0, 0, 0, 0, List.of(), List.of());
        }

        List<UUID> projectIds = visibleProjects.stream().map(ProjectEntity::getId).toList();
        Map<UUID, String> projectNames = visibleProjects.stream()
            .collect(Collectors.toMap(ProjectEntity::getId, ProjectEntity::getName, (a, b) -> a));

        Map<UUID, ProjectIssueAggregate> countsByProject = issues.summarizeByProjectIds(projectIds).stream()
            .filter(agg -> agg.projectId() != null)
            .collect(Collectors.toMap(ProjectIssueAggregate::projectId, Function.identity(), (a, b) -> a));
        List<IssueSprintEntity> activeSprints = sprints.findByProjectIdInAndStatus(projectIds, SprintStatus.ACTIVE);
        List<ProjectIssueEntity> recentIssues = issues.findByProjectIdInOrderByUpdatedAtDesc(
            projectIds, PageRequest.of(0, RECENT_ISSUES_LIMIT)
        );

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
            ProjectIssueAggregate counts = countsByProject.getOrDefault(project.getId(), ProjectIssueAggregate.EMPTY);
            ProjectIssueSummaryDto summary = toSummary(project, counts, activeSprintByProject.get(project.getId()));
            summaries.add(summary);
            totalIssues += summary.totalIssues();
            openIssues += summary.backlogCount() + summary.todoCount();
            inProgressIssues += summary.inProgressCount() + summary.inReviewCount();
            doneIssues += summary.doneCount();
            criticalIssues += summary.criticalCount();
        }

        List<IssueDto> recentDtos = lookup.toIssueDtos(recentIssues, projectNames);
        return new WorkspaceIssuePortfolioDto(
            workspaceId, totalIssues, openIssues, inProgressIssues, doneIssues,
            criticalIssues, activeSprints.size(), summaries, recentDtos
        );
    }

    private static ProjectIssueSummaryDto toSummary(
        ProjectEntity project, ProjectIssueAggregate counts, String activeSprintName
    ) {
        int total = counts.totalInt();
        int done = counts.doneInt();
        int completionPercent = total == 0 ? 0 : (int) Math.round((done * 100.0) / total);
        return new ProjectIssueSummaryDto(
            project.getId(), project.getName(), project.getSlug(),
            total, counts.backlogInt(), counts.todoInt(), counts.inProgressInt(),
            counts.inReviewInt(), done, counts.criticalInt(),
            activeSprintName, completionPercent
        );
    }
}
