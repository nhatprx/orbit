package com.orbit.git.service;

import com.orbit.ai.entity.AiProviderConfigEntity;
import com.orbit.ai.gateway.LlmGatewayRouter;
import com.orbit.ai.gateway.LlmModels.LlmMessage;
import com.orbit.ai.gateway.LlmModels.LlmRequest;
import com.orbit.ai.gateway.LlmModels.LlmResponse;
import com.orbit.ai.service.AiProviderConfigService;
import com.orbit.ai.service.AiUsageService;
import com.orbit.git.dto.GitCollaborationDtos.GitAiAnalysisDto;
import com.orbit.git.dto.GitCollaborationDtos.GitPrDetailDto;
import com.orbit.git.dto.GitCollaborationDtos.GitWorkflowJobDto;
import com.orbit.git.dto.GitCollaborationDtos.GitWorkflowStepDto;
import com.orbit.git.dto.GitCommitFileDiffDto;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/** Uses the active Orbit LLM provider to review pull requests and diagnose failed CI/CD runs. */
@Service
public class GitAiAnalysisService {

    private static final int MAX_PATCH_BUDGET = 12_000;

    private final AiProviderConfigService aiConfig;
    private final LlmGatewayRouter gatewayRouter;
    private final AiUsageService usageService;

    @Autowired
    public GitAiAnalysisService(
        AiProviderConfigService aiConfig,
        LlmGatewayRouter gatewayRouter,
        @Autowired(required = false) AiUsageService usageService
    ) {
        this.aiConfig = aiConfig;
        this.gatewayRouter = gatewayRouter;
        this.usageService = usageService;
    }

    public GitAiAnalysisDto reviewPullRequest(UUID userId, String repoSlug, GitPrDetailDto detail) {
        String systemPrompt = """
            You are Orbit AI, a senior staff engineer reviewing Pull Request #%d in repository %s.
            Produce a crisp, structured review with sections:
            1. Summary of Changes
            2. Potential Bugs, Edge Cases, or Security Risks
            3. Concrete Recommendations
            Be concise, actionable, and reference exact file names. Do not use emojis.
            """.formatted(detail.pullRequest().number(), repoSlug);

        StringBuilder userPrompt = new StringBuilder();
        userPrompt.append("PR Title: ").append(detail.pullRequest().title()).append('\n');
        userPrompt.append("Branch: ").append(detail.pullRequest().sourceBranch())
            .append(" -> ").append(detail.pullRequest().targetBranch()).append('\n');
        if (detail.pullRequest().description() != null && !detail.pullRequest().description().isBlank()) {
            userPrompt.append("Description: ").append(detail.pullRequest().description()).append('\n');
        }
        userPrompt.append("Changed files (+").append(detail.additions())
            .append(" / -").append(detail.deletions()).append("):\n");

        int remaining = MAX_PATCH_BUDGET;
        for (GitCommitFileDiffDto file : detail.files()) {
            userPrompt.append("\n--- ").append(file.filename()).append(" (").append(file.status())
                .append(", +").append(file.additions()).append("/-").append(file.deletions()).append(") ---\n");
            if (file.patch() != null && remaining > 0) {
                String slice = file.patch().length() > remaining ? file.patch().substring(0, remaining) + "\n...(truncated)" : file.patch();
                userPrompt.append(slice).append('\n');
                remaining -= slice.length();
            }
        }
        return runLlm(userId, systemPrompt, userPrompt.toString());
    }

    public GitAiAnalysisDto explainWorkflowFailure(UUID userId, String repoSlug, long runId, List<GitWorkflowJobDto> jobs) {
        String systemPrompt = """
            You are Orbit AI, a DevOps and CI/CD specialist diagnosing GitHub Actions run #%d in %s.
            Analyze the failed jobs and steps below and provide:
            1. Likely Root Cause
            2. Recommended Fix Steps
            3. What to Check Next
            Be concise, specific, and practical. Do not use emojis.
            """.formatted(runId, repoSlug);

        StringBuilder sb = new StringBuilder("Workflow Jobs & Steps:\n");
        for (GitWorkflowJobDto job : jobs) {
            sb.append("- Job: ").append(job.name())
                .append(" [status=").append(job.status())
                .append(", conclusion=").append(job.conclusion()).append("]\n");
            for (GitWorkflowStepDto step : job.steps()) {
                sb.append("  * #").append(step.number()).append(' ').append(step.name())
                    .append(" -> ").append(step.conclusion() != null ? step.conclusion() : step.status()).append('\n');
            }
        }
        return runLlm(userId, systemPrompt, sb.toString());
    }

    private GitAiAnalysisDto runLlm(UUID userId, String systemPrompt, String userPrompt) {
        AiProviderConfigEntity cfg = aiConfig.getActiveEntity();
        String modelId = cfg.getCoderModel() != null && !cfg.getCoderModel().isBlank()
            ? cfg.getCoderModel()
            : (cfg.getProModel() != null && !cfg.getProModel().isBlank() ? cfg.getProModel() : cfg.getFastModel());
        AiUsageService.ResolvedKey key = usageService != null
            ? usageService.checkBudgetAndResolveKey(userId)
            : new AiUsageService.ResolvedKey(null, "SYSTEM");

        LlmRequest req = new LlmRequest(
            modelId, cfg.getBedrockRegion(), systemPrompt,
            List.of(LlmMessage.user(userPrompt)), List.of(), false, 1400, key.apiKeyOverride()
        );
        LlmResponse resp = gatewayRouter.complete(cfg, req, null);
        if (usageService != null && (resp.inputTokens() > 0 || resp.outputTokens() > 0)) {
            usageService.recordUsage(
                userId, null, null, cfg.getActiveProvider().name(), modelId,
                resp.generationId(), resp.inputTokens(), resp.outputTokens(), resp.costUsd(), key.keySource()
            );
        }
        String text = resp.content() == null || resp.content().isBlank()
            ? "No analysis was generated by the AI provider."
            : resp.content().trim();
        return new GitAiAnalysisDto(text, modelId);
    }
}
