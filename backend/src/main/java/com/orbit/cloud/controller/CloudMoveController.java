package com.orbit.cloud.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.cloud.dto.MoveCloudNodesRequest;
import com.orbit.cloud.dto.MoveCloudNodesResponse;
import com.orbit.cloud.service.CloudMoveService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Batch and cross-scope move endpoint across User, Workspace, and Project Cloud Files scopes. */
@RestController
@RequestMapping("/api/v1/cloud/nodes")
public class CloudMoveController {

    private final CloudMoveService moveService;

    public CloudMoveController(CloudMoveService moveService) {
        this.moveService = moveService;
    }

    @PostMapping("/move")
    public MoveCloudNodesResponse moveNodes(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody MoveCloudNodesRequest request
    ) {
        return moveService.moveNodes(principal.userId(), request);
    }
}
