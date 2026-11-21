package com.orbit.git;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.common.ApiException;
import com.orbit.common.GlobalExceptionHandler;
import com.orbit.git.client.GitHubClient;
import com.orbit.git.config.GitProperties;
import com.orbit.git.controller.*;
import com.orbit.git.dto.*;
import com.orbit.git.entity.*;
import com.orbit.git.repository.*;
import com.orbit.git.service.*;
import com.orbit.workspace.permission.Permissions;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class GitApiIntegrationTest {

    private final UUID userId = UUID.randomUUID();
    private final UUID wsId = UUID.randomUUID();
    private final UUID projId = UUID.randomUUID();
    private final String wsBase = "/api/v1/workspaces/" + wsId + "/git";
    private final String projBase = "/api/v1/workspaces/" + wsId + "/projects/" + projId + "/git";
    private MockMvc mvc;
    private GitHubClient gitHub;
    private GitAccessGuard guard;

    @BeforeEach
    void setUp() {
        gitHub = mock(GitHubClient.class);
        guard = mock(GitAccessGuard.class);
        Map<String, GitRepositoryEntity> repoStore = new ConcurrentHashMap<>();
        List<GitCommitCacheEntity> commitStore = Collections.synchronizedList(new ArrayList<>());

        GitRepositoryJpaRepository repoJpa = mock(GitRepositoryJpaRepository.class);
        when(repoJpa.findByScopeTypeAndScopeId(any(), any())).thenAnswer(i ->
            Optional.ofNullable(repoStore.get(i.getArgument(0) + ":" + i.getArgument(1))));
        when(repoJpa.save(any())).thenAnswer(i -> {
            GitRepositoryEntity e = i.getArgument(0);
            repoStore.put(e.getScopeType() + ":" + e.getScopeId(), e);
            return e;
        });
        doAnswer(i -> { repoStore.remove(i.getArgument(0) + ":" + i.getArgument(1)); return null; })
            .when(repoJpa).deleteByScopeTypeAndScopeId(any(), any());

        GitCommitCacheRepository commitRepo = mock(GitCommitCacheRepository.class);
        when(commitRepo.findByRepositoryIdAndBranchOrderByCommittedAtDesc(any(), anyString())).thenAnswer(i ->
            commitStore.stream().filter(c -> c.getRepositoryId().equals(i.getArgument(0))
                && c.getBranch().equals(i.getArgument(1))).toList());
        doAnswer(i -> {
            commitStore.removeIf(c -> c.getRepositoryId().equals(i.getArgument(0)) && c.getBranch().equals(i.getArgument(1)));
            return null;
        }).when(commitRepo).deleteByRepositoryIdAndBranch(any(), anyString());
        doAnswer(i -> {
            commitStore.removeIf(c -> c.getRepositoryId().equals(i.getArgument(0)));
            return null;
        }).when(commitRepo).deleteByRepositoryId(any());
        when(commitRepo.saveAll(any())).thenAnswer(i -> {
            Iterable<GitCommitCacheEntity> items = i.getArgument(0);
            items.forEach(commitStore::add);
            return items;
        });

        when(guard.requireWorkspaceScope(eq(userId), eq(wsId), anyString())).thenReturn(GitScope.workspace(wsId));
        when(guard.requireProjectScope(eq(userId), eq(wsId), eq(projId), anyString())).thenReturn(GitScope.project(wsId, projId));

        GitProperties props = new GitProperties();
        props.setEncryptionSecret("integration-test-secret-key-2026");
        GitRepositoryService repoSvc = new GitRepositoryService(repoJpa, commitRepo, gitHub, new GitTokenCrypto(props));
        GitControllerSupport support = new GitControllerSupport(
            repoSvc, new GitContentService(repoSvc, gitHub, commitRepo),
            new GitHistoryService(repoSvc, gitHub, commitRepo, repoJpa));
        mvc = MockMvcBuilders.standaloneSetup(new WorkspaceGitController(guard, support), new ProjectGitController(guard, support))
            .setControllerAdvice(new GlobalExceptionHandler())
            .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver()).build();
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(new AuthenticatedUserPrincipal(userId, "jti", "user", "none"), null, List.of()));
    }

    @Test
    void connectCreateUpdateTokenAndDisconnectLifecycle() throws Exception {
        var remote = new GitHubRemoteRepoDto("acme", "orbit", "acme/orbit", "main", true,
            "https://github.com/acme/orbit.git", "https://github.com/acme/orbit", "Orbit");
        when(gitHub.inspectToken("ghp_token12345678")).thenReturn(
            new InspectGitTokenResponse("octo", "Octo", List.of("repo"), List.of(remote)));
        when(gitHub.getRepository(anyString(), eq("acme"), eq("orbit"))).thenReturn(remote);
        when(gitHub.createRepository(anyString(), eq("new-repo"), any(), eq(true))).thenReturn(
            new GitHubRemoteRepoDto("acme", "new-repo", "acme/new-repo", "main", true,
                "https://github.com/acme/new-repo.git", "https://github.com/acme/new-repo", "New"));

        mvc.perform(post(wsBase + "/inspect-token").contentType(MediaType.APPLICATION_JSON)
                .content("{\"accessToken\":\"ghp_token12345678\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.username").value("octo"));
        mvc.perform(get(wsBase + "/repository"))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("GIT_REPO_NOT_CONNECTED"));
        mvc.perform(post(wsBase + "/repository/connect").contentType(MediaType.APPLICATION_JSON)
                .content("{\"accessToken\":\"ghp_token12345678\",\"repoOwner\":\"acme\",\"repoName\":\"orbit\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.slug").value("acme/orbit"))
            .andExpect(jsonPath("$.tokenHint").value("ghp_...5678"));
        mvc.perform(patch(wsBase + "/repository/token").contentType(MediaType.APPLICATION_JSON)
                .content("{\"accessToken\":\"ghp_rotated9999\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.tokenHint").value("ghp_...9999"));
        mvc.perform(delete(wsBase + "/repository")).andExpect(status().isNoContent());
        mvc.perform(get(wsBase + "/repository")).andExpect(status().isNotFound());
        mvc.perform(post(projBase + "/repository/create").contentType(MediaType.APPLICATION_JSON)
                .content("{\"accessToken\":\"ghp_token12345678\",\"repoName\":\"new-repo\",\"privateRepo\":true}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.slug").value("acme/new-repo"));
    }

    @Test
    void branchesFilesValidationCommitsAndPullRequestsWorkEndToEnd() throws Exception {
        when(gitHub.getRepository(anyString(), eq("acme"), eq("orbit"))).thenReturn(
            new GitHubRemoteRepoDto("acme", "orbit", "acme/orbit", "main", true,
                "https://github.com/acme/orbit.git", "https://github.com/acme/orbit", "Orbit"));
        mvc.perform(post(wsBase + "/repository/connect").contentType(MediaType.APPLICATION_JSON)
                .content("{\"accessToken\":\"ghp_seed12345678\",\"repoOwner\":\"acme\",\"repoName\":\"orbit\"}"))
            .andExpect(status().isCreated());
        var now = Instant.parse("2026-01-01T00:00:00Z");
        var commitDto = new GitCommitDto("sha1", "feat: init", "Alice", "a@test", now, 1, 10, 2, "https://gh/c/1");
        var fileDto = new GitFileContentDto("src/app.ts", "app.ts", "fsha", 12, "main", "typescript", "export {};", "https://gh/f");
        when(gitHub.createBranch(anyString(), eq("acme"), eq("orbit"), eq("feat"), eq("main"), eq("main")))
            .thenReturn(new GitBranchDto("feat", "sha1", false, false));
        when(gitHub.listDirectory(anyString(), eq("acme"), eq("orbit"), eq("main"), eq("")))
            .thenReturn(List.of(new GitTreeEntryDto("src", "src", "dir", 0, "d1", null)));
        when(gitHub.upsertFile(anyString(), eq("acme"), eq("orbit"), any())).thenReturn(new GitMutationResultDto(fileDto, commitDto));
        when(gitHub.deleteFile(anyString(), eq("acme"), eq("orbit"), any())).thenReturn(new GitMutationResultDto(null, commitDto));
        when(gitHub.listCommits(anyString(), eq("acme"), eq("orbit"), eq("main"), anyInt())).thenReturn(List.of(commitDto));
        when(gitHub.getCommitDetail(anyString(), eq("acme"), eq("orbit"), eq("sha1")))
            .thenReturn(new GitCommitDetailDto("sha1", "feat: init", "Alice", "a@test", now, 10, 2,
                List.of(new GitCommitFileDiffDto("src/app.ts", "added", 10, 0, 10, "+export {};")), "https://gh/c/1"));
        when(gitHub.createPullRequest(anyString(), eq("acme"), eq("orbit"), any()))
            .thenReturn(new GitPullRequestDto(7, "Add app", "desc", "alice", "feat", "main", "open", now, "https://gh/pr/7"));
        when(gitHub.mergePullRequest(anyString(), eq("acme"), eq("orbit"), eq(7), any()))
            .thenReturn(new GitPullRequestDto(7, "Add app", "desc", "alice", "feat", "main", "merged", now, "https://gh/pr/7"));

        mvc.perform(post(wsBase + "/branches").contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchName\":\"feat\",\"sourceBranch\":\"main\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("feat"));
        mvc.perform(delete(wsBase + "/branches").param("name", "main"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("CANNOT_DELETE_DEFAULT_BRANCH"));
        mvc.perform(delete(wsBase + "/branches").param("name", "feature/auth")).andExpect(status().isNoContent());
        verify(gitHub).deleteBranch(anyString(), eq("acme"), eq("orbit"), eq("feature/auth"));
        mvc.perform(get(wsBase + "/file?branch=main&path=../secret.env"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_GIT_PATH"));
        mvc.perform(get(wsBase + "/tree?branch=main")).andExpect(status().isOk()).andExpect(jsonPath("$[0].name").value("src"));
        mvc.perform(put(wsBase + "/file").contentType(MediaType.APPLICATION_JSON)
                .content("{\"branch\":\"main\",\"path\":\"src/app.ts\",\"content\":\"export {};\",\"commitMessage\":\"add\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.file.sha").value("fsha"));
        mvc.perform(delete(wsBase + "/file").contentType(MediaType.APPLICATION_JSON)
                .content("{\"branch\":\"main\",\"path\":\"src/app.ts\",\"sha\":\"fsha\",\"commitMessage\":\"rm\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.commit.sha").value("sha1"));
        mvc.perform(get(wsBase + "/commits?branch=main")).andExpect(status().isOk()).andExpect(jsonPath("$[0].sha").value("sha1"));
        mvc.perform(get(wsBase + "/commits?branch=main")).andExpect(status().isOk());
        verify(gitHub, times(1)).listCommits(anyString(), eq("acme"), eq("orbit"), eq("main"), anyInt());
        mvc.perform(post(wsBase + "/commits/sync?branch=main")).andExpect(status().isOk());
        verify(gitHub, times(2)).listCommits(anyString(), eq("acme"), eq("orbit"), eq("main"), anyInt());
        mvc.perform(get(wsBase + "/commits/sha1")).andExpect(status().isOk()).andExpect(jsonPath("$.files[0].filename").value("src/app.ts"));
        mvc.perform(post(wsBase + "/pulls").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Add app\",\"description\":\"desc\",\"sourceBranch\":\"feat\",\"targetBranch\":\"main\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.number").value(7));
        mvc.perform(post(wsBase + "/pulls/7/merge").contentType(MediaType.APPLICATION_JSON)
                .content("{\"mergeMethod\":\"squash\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("merged"));
    }

    @Test
    void rbacGuardEnforcesManageAndWritePermissions() throws Exception {
        when(guard.requireWorkspaceScope(userId, wsId, Permissions.GIT_MANAGE))
            .thenThrow(ApiException.forbidden("FORBIDDEN", "Missing git.manage"));
        when(guard.requireProjectScope(userId, wsId, projId, Permissions.PGIT_READ))
            .thenThrow(ApiException.forbidden("MODULE_DISABLED", "The git module is disabled here."));
        mvc.perform(post(wsBase + "/repository/connect").contentType(MediaType.APPLICATION_JSON)
                .content("{\"accessToken\":\"ghp_123456789\",\"repoOwner\":\"a\",\"repoName\":\"b\"}"))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        mvc.perform(get(projBase + "/repository"))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("MODULE_DISABLED"));
    }
}
