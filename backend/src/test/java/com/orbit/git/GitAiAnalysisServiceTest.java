package com.orbit.git;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.ai.entity.AiProviderConfigEntity;
import com.orbit.ai.entity.AiProviderType;
import com.orbit.ai.gateway.LlmGatewayRouter;
import com.orbit.ai.gateway.LlmModels.LlmRequest;
import com.orbit.ai.gateway.LlmModels.LlmResponse;
import com.orbit.ai.service.AiProviderConfigService;
import com.orbit.git.dto.GitCollaborationDtos.*;
import com.orbit.git.dto.GitCommitFileDiffDto;
import com.orbit.git.dto.GitPullRequestDto;
import com.orbit.git.service.GitAiAnalysisService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class GitAiAnalysisServiceTest {

    @Test
    void reviewsPullRequestWithFileDiffsIncludedInPrompt() {
        AiProviderConfigService aiConfig = mock(AiProviderConfigService.class);
        LlmGatewayRouter gateway = mock(LlmGatewayRouter.class);
        AiProviderConfigEntity cfg = new AiProviderConfigEntity();
        cfg.setActiveProvider(AiProviderType.OPENROUTER);
        cfg.setCoderModel("anthropic/claude-3.7-sonnet");
        when(aiConfig.getActiveEntity()).thenReturn(cfg);
        when(gateway.complete(any(), any(), any())).thenReturn(
            new LlmResponse("1. Summary: Added null check.", List.of(), 120, 45)
        );

        GitPullRequestDto pr = new GitPullRequestDto(
            12, "Guard null token", "Prevents NPE", "nhatprx",
            "fix/null", "main", "open", Instant.now(), "https://github.com/o/r/pull/12"
        );
        GitPrDetailDto detail = new GitPrDetailDto(
            pr,
            List.of(new GitCommitFileDiffDto("src/Auth.java", "modified", 4, 1, 5, "@@ -1 +1 @@\n+if (tok == null) return;")),
            List.of(), 4, 1
        );

        GitAiAnalysisService svc = new GitAiAnalysisService(aiConfig, gateway, null);
        GitAiAnalysisDto result = svc.reviewPullRequest(UUID.randomUUID(), "o/r", detail);

        ArgumentCaptor<LlmRequest> cap = ArgumentCaptor.forClass(LlmRequest.class);
        verify(gateway).complete(any(), cap.capture(), any());
        assertTrue(cap.getValue().messages().getFirst().content().contains("src/Auth.java"));
        assertEquals("anthropic/claude-3.7-sonnet", result.modelUsed());
        assertTrue(result.summary().contains("Added null check"));
    }

    @Test
    void explainsWorkflowFailureFromJobsAndSteps() {
        AiProviderConfigService aiConfig = mock(AiProviderConfigService.class);
        LlmGatewayRouter gateway = mock(LlmGatewayRouter.class);
        AiProviderConfigEntity cfg = new AiProviderConfigEntity();
        cfg.setActiveProvider(AiProviderType.OPENROUTER);
        cfg.setFastModel("google/gemini-2.5-flash");
        when(aiConfig.getActiveEntity()).thenReturn(cfg);
        when(gateway.complete(any(), any(), any())).thenReturn(
            new LlmResponse("Likely Root Cause: Unit test failed in Maven step.", List.of(), 80, 30)
        );

        List<GitWorkflowJobDto> jobs = List.of(new GitWorkflowJobDto(
            99L, "Backend Tests", "completed", "failure", Instant.now(), Instant.now(),
            List.of(new GitWorkflowStepDto(3, "Run mvn test", "completed", "failure"))
        ));

        GitAiAnalysisService svc = new GitAiAnalysisService(aiConfig, gateway, null);
        GitAiAnalysisDto result = svc.explainWorkflowFailure(UUID.randomUUID(), "o/r", 500L, jobs);

        assertTrue(result.summary().contains("Maven step"));
    }
}
