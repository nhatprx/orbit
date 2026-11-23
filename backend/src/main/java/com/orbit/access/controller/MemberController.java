package com.orbit.access.controller;

import com.orbit.access.dto.AddProjectMemberRequest;
import com.orbit.access.dto.AssignMemberRoleRequest;
import com.orbit.access.dto.MemberDto;
import com.orbit.access.dto.UpdateMemberSubRoleRequest;
import com.orbit.access.service.ProjectMemberService;
import com.orbit.access.service.WorkspaceMemberService;
import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.common.PageParams;
import com.orbit.common.PageResponse;
import jakarta.validation.Valid;
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
@RequestMapping("/api/v1/workspaces/{workspaceId}")
public class MemberController {

    private final WorkspaceMemberService workspaceMembers;
    private final ProjectMemberService projectMembers;

    public MemberController(WorkspaceMemberService workspaceMembers, ProjectMemberService projectMembers) {
        this.workspaceMembers = workspaceMembers;
        this.projectMembers = projectMembers;
    }

    @GetMapping("/members")
    public PageResponse<MemberDto> listWorkspaceMembers(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "" + PageParams.DEFAULT_SIZE) int size
    ) {
        return workspaceMembers.list(principal.userId(), workspaceId, page, size);
    }

    @PatchMapping("/members/{userId}/role")
    public MemberDto assignWorkspaceMemberRole(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID userId,
        @Valid @RequestBody AssignMemberRoleRequest request
    ) {
        return workspaceMembers.assignRole(principal.userId(), workspaceId, userId, request);
    }

    @PatchMapping("/members/{userId}/sub-role")
    public MemberDto updateWorkspaceMemberSubRole(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID userId,
        @Valid @RequestBody UpdateMemberSubRoleRequest request
    ) {
        return workspaceMembers.updateSubRole(principal.userId(), workspaceId, userId, request.subRole());
    }

    @DeleteMapping("/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeWorkspaceMember(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID userId
    ) {
        workspaceMembers.remove(principal.userId(), workspaceId, userId);
    }

    @GetMapping("/projects/{projectId}/members")
    public PageResponse<MemberDto> listProjectMembers(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "" + PageParams.DEFAULT_SIZE) int size
    ) {
        return projectMembers.list(principal.userId(), workspaceId, projectId, page, size);
    }

    @PostMapping("/projects/{projectId}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public MemberDto addProjectMember(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @Valid @RequestBody AddProjectMemberRequest request
    ) {
        return projectMembers.add(principal.userId(), workspaceId, projectId, request);
    }

    @PatchMapping("/projects/{projectId}/members/{userId}/role")
    public MemberDto assignProjectMemberRole(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID userId,
        @Valid @RequestBody AssignMemberRoleRequest request
    ) {
        return projectMembers.assignRole(principal.userId(), workspaceId, projectId, userId, request);
    }

    @PatchMapping("/projects/{projectId}/members/{userId}/sub-role")
    public MemberDto updateProjectMemberSubRole(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID userId,
        @Valid @RequestBody UpdateMemberSubRoleRequest request
    ) {
        return projectMembers.updateSubRole(principal.userId(), workspaceId, projectId, userId, request.subRole());
    }

    @DeleteMapping("/projects/{projectId}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeProjectMember(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId,
        @PathVariable UUID projectId,
        @PathVariable UUID userId
    ) {
        projectMembers.remove(principal.userId(), workspaceId, projectId, userId);
    }
}
