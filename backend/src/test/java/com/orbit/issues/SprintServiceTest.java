package com.orbit.issues;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.auth.repository.UserRepository;
import com.orbit.common.ApiException;
import com.orbit.issues.dto.CreateSprintRequest;
import com.orbit.issues.dto.SprintDto;
import com.orbit.issues.dto.UpdateSprintRequest;
import com.orbit.issues.entity.IssueSprintEntity;
import com.orbit.issues.entity.IssueStatus;
import com.orbit.issues.entity.ProjectIssueEntity;
import com.orbit.issues.entity.SprintStatus;
import com.orbit.issues.repository.IssueActivityRepository;
import com.orbit.issues.repository.IssueCommentRepository;
import com.orbit.issues.repository.IssueSprintRepository;
import com.orbit.issues.repository.ProjectIssueRepository;
import com.orbit.issues.repository.SprintMetricsAggregate;
import com.orbit.issues.service.IssueAccessGuard;
import com.orbit.issues.service.IssueLookupHelper;
import com.orbit.issues.service.SprintService;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

class SprintServiceTest {

    private final UUID userId = UUID.randomUUID();
    private final UUID workspaceId = UUID.randomUUID();
    private final UUID projectId = UUID.randomUUID();

    private IssueSprintRepository sprints;
    private ProjectIssueRepository issues;
    private IssueActivityRepository activities;
    private SprintService service;

    @BeforeEach
    void setUp() {
        sprints = mock(IssueSprintRepository.class);
        issues = mock(ProjectIssueRepository.class);
        activities = mock(IssueActivityRepository.class);
        IssueLookupHelper lookup = new IssueLookupHelper(
            mock(UserRepository.class), sprints, issues, mock(IssueCommentRepository.class), mock(IssueAccessGuard.class)
        );
        service = new SprintService(sprints, issues, activities, lookup);

        when(sprints.save(any())).thenAnswer(inv -> {
            IssueSprintEntity e = inv.getArgument(0);
            if (e.getId() == null) e.setId(UUID.randomUUID());
            return e;
        });
        when(issues.aggregateSprintMetricsBySprintId(any())).thenReturn(Optional.empty());
    }

    @Test
    void createSprintValidatesDatesAndCreatesPlannedSprint() {
        LocalDate start = LocalDate.of(2026, 6, 1);
        LocalDate end = LocalDate.of(2026, 6, 14);
        SprintDto created = service.createSprint(userId, workspaceId, projectId, new CreateSprintRequest("Sprint 1", "Ship auth", start, end));
        assertEquals("PLANNED", created.status());
        assertEquals("Sprint 1", created.name());
        assertEquals(0, created.totalIssues());

        ApiException badDates = assertThrows(ApiException.class, () -> service.createSprint(
            userId, workspaceId, projectId, new CreateSprintRequest("Sprint 2", null, end, start)
        ));
        assertEquals(HttpStatus.BAD_REQUEST, badDates.getStatus());
        assertEquals("INVALID_DATE_RANGE", badDates.getCode());
    }

    @Test
    void listSprintsUsesSqlGroupByMetricsAggregation() {
        UUID sprintId = UUID.randomUUID();
        IssueSprintEntity sprint = sprint(sprintId, "Sprint 10", SprintStatus.ACTIVE);
        when(sprints.findByProjectIdOrderByCreatedAtDesc(projectId)).thenReturn(List.of(sprint));
        when(issues.aggregateSprintMetricsByProjectId(projectId))
            .thenReturn(List.of(new SprintMetricsAggregate(sprintId, 3L, 1L, 8L, 5L)));

        List<SprintDto> list = service.listSprints(userId, workspaceId, projectId);
        assertEquals(1, list.size());
        SprintDto dto = list.get(0);
        assertEquals(3, dto.totalIssues());
        assertEquals(1, dto.completedIssues());
        assertEquals(8, dto.totalStoryPoints());
        assertEquals(5, dto.completedStoryPoints());
        verify(issues).aggregateSprintMetricsByProjectId(projectId);
    }

    @Test
    void updateSprintBlocksBackwardsTransitionsAndConcurrentDoubleActivation() {
        UUID sprintId = UUID.randomUUID();
        IssueSprintEntity completed = sprint(sprintId, "Sprint 9", SprintStatus.COMPLETED);
        when(sprints.findByIdAndProjectId(sprintId, projectId)).thenReturn(Optional.of(completed));

        ApiException reopenActive = assertThrows(ApiException.class, () -> service.updateSprint(
            userId, workspaceId, projectId, sprintId, new UpdateSprintRequest(null, null, "ACTIVE", null, null, null)
        ));
        assertEquals(HttpStatus.BAD_REQUEST, reopenActive.getStatus());
        assertEquals("INVALID_SPRINT_TRANSITION", reopenActive.getCode());

        assertEquals("INVALID_SPRINT_TRANSITION", assertThrows(ApiException.class, () -> service.updateSprint(
            userId, workspaceId, projectId, sprintId, new UpdateSprintRequest(null, null, "PLANNED", null, null, null)
        )).getCode());

        IssueSprintEntity active = sprint(sprintId, "Sprint 11", SprintStatus.ACTIVE);
        when(sprints.findByIdAndProjectId(sprintId, projectId)).thenReturn(Optional.of(active));
        assertEquals("INVALID_SPRINT_TRANSITION", assertThrows(ApiException.class, () -> service.updateSprint(
            userId, workspaceId, projectId, sprintId, new UpdateSprintRequest(null, null, "PLANNED", null, null, null)
        )).getCode());

        IssueSprintEntity planned = sprint(sprintId, "Sprint 12", SprintStatus.PLANNED);
        when(sprints.findByIdAndProjectId(sprintId, projectId)).thenReturn(Optional.of(planned));
        when(sprints.existsByProjectIdAndStatusAndIdNot(projectId, SprintStatus.ACTIVE, sprintId)).thenReturn(false);
        doThrow(new DataIntegrityViolationException("uq_issue_sprints_single_active")).when(sprints).save(any());

        ApiException raceConflict = assertThrows(ApiException.class, () -> service.updateSprint(
            userId, workspaceId, projectId, sprintId, new UpdateSprintRequest(null, null, "ACTIVE", null, null, null)
        ));
        assertEquals(HttpStatus.CONFLICT, raceConflict.getStatus());
        assertEquals("ACTIVE_SPRINT_EXISTS", raceConflict.getCode());
    }

    @Test
    void completeSprintHandlesRolloverToggleMetadataEditsAndDelete() {
        UUID sprintId = UUID.randomUUID();
        IssueSprintEntity active = sprint(sprintId, "Sprint 12", SprintStatus.ACTIVE);
        active.setStartDate(LocalDate.of(2026, 7, 1));
        when(sprints.findByIdAndProjectId(sprintId, projectId)).thenReturn(Optional.of(active));
        ProjectIssueEntity done = sprintIssue(sprintId, IssueStatus.DONE, 5);
        ProjectIssueEntity todo = sprintIssue(sprintId, IssueStatus.TODO, 3);
        when(issues.findBySprintIdOrderByIssueNumberAsc(sprintId)).thenReturn(List.of(done, todo));

        SprintDto edited = service.updateSprint(
            userId, workspaceId, projectId, sprintId,
            new UpdateSprintRequest("Sprint 12 Renamed", "New goal", null, null, null, null, true, false)
        );
        assertEquals("Sprint 12 Renamed", edited.name());
        assertNull(edited.startDate());

        SprintDto completed = service.updateSprint(
            userId, workspaceId, projectId, sprintId, new UpdateSprintRequest(null, null, "COMPLETED", null, null, true)
        );
        assertEquals("COMPLETED", completed.status());
        assertEquals(sprintId, done.getSprintId());
        assertNull(todo.getSprintId());
        verify(issues).saveAll(List.of(todo));
        verify(activities).saveAll(any());

        service.deleteSprint(userId, workspaceId, projectId, sprintId);
        verify(sprints).delete(active);
    }

    private IssueSprintEntity sprint(UUID id, String name, SprintStatus status) {
        IssueSprintEntity s = new IssueSprintEntity();
        s.setId(id); s.setWorkspaceId(workspaceId); s.setProjectId(projectId);
        s.setName(name); s.setStatus(status);
        return s;
    }

    private ProjectIssueEntity sprintIssue(UUID sprintId, IssueStatus status, Integer points) {
        ProjectIssueEntity e = new ProjectIssueEntity();
        e.setId(UUID.randomUUID()); e.setWorkspaceId(workspaceId); e.setProjectId(projectId);
        e.setSprintId(sprintId); e.setStatus(status); e.setStoryPoints(points);
        return e;
    }
}
