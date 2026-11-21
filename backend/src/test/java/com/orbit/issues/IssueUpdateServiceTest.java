package com.orbit.issues;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.common.ApiException;
import com.orbit.issues.dto.IssueDto;
import com.orbit.issues.dto.UpdateIssueRequest;
import com.orbit.issues.entity.IssueActivityEntity;
import com.orbit.issues.entity.IssuePriority;
import com.orbit.issues.entity.IssueSprintEntity;
import com.orbit.issues.entity.IssueStatus;
import com.orbit.issues.entity.IssueType;
import com.orbit.issues.entity.ProjectIssueEntity;
import com.orbit.issues.repository.IssueActivityRepository;
import com.orbit.issues.repository.IssueCommentRepository;
import com.orbit.issues.repository.IssueSprintRepository;
import com.orbit.issues.repository.ProjectIssueCounterRepository;
import com.orbit.issues.repository.ProjectIssueRepository;
import com.orbit.issues.service.IssueAccessGuard;
import com.orbit.issues.service.IssueLookupHelper;
import com.orbit.issues.service.IssueService;
import com.orbit.issues.service.IssueUpdateApplier;
import com.orbit.project.entity.ProjectEntity;
import com.orbit.workspace.permission.Permissions;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

class IssueUpdateServiceTest {

    private final UUID userId = UUID.randomUUID();
    private final UUID workspaceId = UUID.randomUUID();
    private final UUID projectId = UUID.randomUUID();

    private ProjectIssueRepository issues;
    private IssueSprintRepository sprints;
    private IssueActivityRepository activities;
    private IssueAccessGuard accessGuard;
    private IssueService service;

    @BeforeEach
    void setUp() {
        issues = mock(ProjectIssueRepository.class);
        sprints = mock(IssueSprintRepository.class);
        IssueCommentRepository comments = mock(IssueCommentRepository.class);
        activities = mock(IssueActivityRepository.class);
        UserRepository users = mock(UserRepository.class);
        accessGuard = mock(IssueAccessGuard.class);

        ProjectEntity project = new ProjectEntity();
        project.setId(projectId);
        project.setWorkspaceId(workspaceId);
        project.setName("Project Alpha");
        project.setSlug("project-alpha");

        when(accessGuard.requireProjectPermission(userId, workspaceId, projectId, Permissions.PISSUES_WRITE)).thenReturn(project);
        when(issues.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(issues.findByParentIdIn(anyCollection())).thenReturn(List.of());
        when(comments.countByIssueIds(anyCollection())).thenReturn(List.of());

        UserEntity reporter = new UserEntity();
        reporter.setId(userId);
        reporter.setDisplayName("Alice Dev");
        when(users.findAllById(any())).thenReturn(List.of(reporter));

        IssueLookupHelper lookup = new IssueLookupHelper(users, sprints, issues, comments, accessGuard);
        service = new IssueService(
            issues, mock(ProjectIssueCounterRepository.class), sprints, comments, activities, lookup,
            new IssueUpdateApplier(issues, sprints, lookup)
        );
    }

    @Test
    @SuppressWarnings("unchecked")
    void updateLogsFieldSpecificActivitiesAndSupportsClearFlags() {
        UUID issueId = UUID.randomUUID();
        UUID sprintId = UUID.randomUUID();
        ProjectIssueEntity entity = issue(issueId, 3, "PA-3", IssueType.STORY, IssueStatus.TODO, IssuePriority.MEDIUM);
        entity.setSprintId(sprintId);
        entity.setAssigneeId(userId);
        entity.setStoryPoints(8);

        IssueSprintEntity sprint = new IssueSprintEntity();
        sprint.setId(sprintId);
        sprint.setName("Sprint 1");
        when(sprints.findAllById(any())).thenReturn(List.of(sprint));
        when(issues.findByIdAndProjectId(issueId, projectId)).thenReturn(Optional.of(entity));

        IssueDto updated = service.updateIssue(userId, workspaceId, projectId, issueId, new UpdateIssueRequest(
            null, "Updated title", null, "DONE", "CRITICAL", null, true,
            null, true, null, null, null, true, null, null, true
        ));

        assertEquals("DONE", updated.status());
        assertEquals("CRITICAL", updated.priority());
        assertNull(updated.sprintId());
        assertNull(updated.assigneeId());
        assertNull(updated.storyPoints());

        ArgumentCaptor<List<IssueActivityEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(activities).saveAll(captor.capture());
        assertEquals(
            List.of("STATUS_CHANGED", "PRIORITY_CHANGED", "SPRINT_CHANGED", "ASSIGNEE_CHANGED"),
            captor.getValue().stream().map(IssueActivityEntity::getAction).toList()
        );
    }

    @Test
    @SuppressWarnings("unchecked")
    void updateValidatesAssigneeMembershipAndRejectsCircularParents() {
        UUID issueId = UUID.randomUUID();
        UUID outsiderId = UUID.randomUUID();
        ProjectIssueEntity entity = issue(issueId, 3, "PA-3", IssueType.STORY, IssueStatus.TODO, IssuePriority.MEDIUM);
        when(issues.findByIdAndProjectId(issueId, projectId)).thenReturn(Optional.of(entity));
        doThrow(ApiException.badRequest("INVALID_ASSIGNEE", "Assignee not in workspace."))
            .when(accessGuard).requireValidAssignee(workspaceId, projectId, outsiderId);

        ApiException badAssignee = assertThrows(ApiException.class, () -> service.updateIssue(
            userId, workspaceId, projectId, issueId, new UpdateIssueRequest(
                null, null, null, null, null, null, null, null, null, null, null, outsiderId, null, null, null, null
            )
        ));
        assertEquals(HttpStatus.BAD_REQUEST, badAssignee.getStatus());
        assertEquals("INVALID_ASSIGNEE", badAssignee.getCode());

        service.updateIssue(userId, workspaceId, projectId, issueId, new UpdateIssueRequest(
            null, "Renamed Story", "Better description", null, null, null, null,
            null, null, null, null, null, null, List.of("api"), null, null
        ));
        ArgumentCaptor<List<IssueActivityEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(activities).saveAll(captor.capture());
        assertEquals(List.of("UPDATED"), captor.getValue().stream().map(IssueActivityEntity::getAction).toList());

        ApiException selfParent = assertThrows(ApiException.class, () -> service.updateIssue(
            userId, workspaceId, projectId, issueId, new UpdateIssueRequest(
                null, null, null, null, null, null, null, null, null, issueId, null, null, null, null, null, null
            )
        ));
        assertEquals(HttpStatus.BAD_REQUEST, selfParent.getStatus());
        assertEquals("CIRCULAR_PARENT", selfParent.getCode());

        UUID childId = UUID.randomUUID();
        ProjectIssueEntity child = issue(childId, 4, "PA-4", IssueType.TASK, IssueStatus.TODO, IssuePriority.MEDIUM);
        child.setParentId(issueId);
        when(issues.findByIdAndProjectId(childId, projectId)).thenReturn(Optional.of(child));
        assertEquals("CIRCULAR_PARENT", assertThrows(ApiException.class, () -> service.updateIssue(
            userId, workspaceId, projectId, issueId, new UpdateIssueRequest(
                null, null, null, null, null, null, null, null, null, childId, null, null, null, null, null, null
            )
        )).getCode());
    }

    private ProjectIssueEntity issue(UUID id, int num, String key, IssueType type, IssueStatus status, IssuePriority priority) {
        ProjectIssueEntity e = new ProjectIssueEntity();
        e.setId(id); e.setWorkspaceId(workspaceId); e.setProjectId(projectId);
        e.setIssueNumber(num); e.setIssueKey(key); e.setType(type);
        e.setTitle("Issue " + num); e.setStatus(status); e.setPriority(priority); e.setReporterId(userId);
        return e;
    }
}
