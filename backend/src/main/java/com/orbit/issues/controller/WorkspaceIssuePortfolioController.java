package com.orbit.issues.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.issues.dto.WorkspaceIssuePortfolioDto;
import com.orbit.issues.service.WorkspaceIssuePortfolioService;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/issues")
public class WorkspaceIssuePortfolioController {

    private final WorkspaceIssuePortfolioService portfolio;

    public WorkspaceIssuePortfolioController(WorkspaceIssuePortfolioService portfolio) {
        this.portfolio = portfolio;
    }

    @GetMapping("/portfolio")
    public WorkspaceIssuePortfolioDto getPortfolio(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @PathVariable UUID workspaceId
    ) {
        return portfolio.getPortfolio(principal.userId(), workspaceId);
    }
}
