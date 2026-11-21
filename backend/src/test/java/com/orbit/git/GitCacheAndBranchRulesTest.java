package com.orbit.git;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.common.GlobalExceptionHandler;
import com.orbit.git.client.GitHubClient;
import com.orbit.git.config.GitProperties;
import com.orbit.git.controller.*;
import com.orbit.git.dto.*;
import com.orbit.git.entity.*;
import com.orbit.git.repository.*;
import com.orbit.git.service.*;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class GitCacheAndBranchRulesTest {

    private final UUID userId = UUID.randomUUID();
    private final UUID wsId = UUID.randomUUID();
    private final UUID projId = UUID.randomUUID();
    private final GitScope scope = GitScope.project(wsId, projId);
    private List<GitCommitCacheEntity> commitStore;
    private GitHubClient gitHub;
    private GitRepositoryService repoSvc;
    private GitContentService contentSvc;
    private GitHistoryService historySvc;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        gitHub = mock(GitHubClient.class);
        GitAccessGuard guard = mock(GitAccessGuard.class);
        Map<String, GitRepositoryEntity> repoStore = new ConcurrentHashMap<>();
        commitStore = Collections.synchronizedList(new ArrayList<>());

        GitRepositoryJpaRepository repoJpa = mock(GitRepositoryJpaRepository.class);
        when(repoJpa.findByScopeTypeAndScopeId(any(), any())).thenAnswer(i ->
            Optional.ofNullable(repoStore.get(i.getArgument(0) + ":" + i.getArgument(1))));
        when(repoJpa.save(any())).thenAnswer(i -> {
            GitRepositoryEntity e = i.getArgument(0);
            repoStore.put(e.getScopeType() + ":" + e.getScopeId(), e);
            return e;
        });

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

        when(guard.requireProjectScope(eq(userId), eq(wsId), eq(projId), anyString())).thenReturn(scope);
        GitProperties props = new GitProperties();
        props.setEncryptionSecret("cache-test-secret-key-2026");
        repoSvc = new GitRepositoryService(repoJpa, commitRepo, gitHub, new GitTokenCrypto(props));
        contentSvc = new GitContentService(repoSvc, gitHub, commitRepo);
        historySvc = new GitHistoryService(repoSvc, gitHub, commitRepo, repoJpa);
        GitControllerSupport support = new GitControllerSupport(repoSvc, contentSvc, historySvc);
        mvc = MockMvcBuilders.standaloneSetup(new ProjectGitController(guard, support))
            .setControllerAdvice(new GlobalExceptionHandler())
            .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver()).build();
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(new AuthenticatedUserPrincipal(userId, "jti", "user", "none"), null, List.of()));
    }

    @Test
    void projectControllerDeletesSlashedBranchAndRejectsInvalidName() throws Exception {
        seedRepo("acme", "repo-a");
        String base = "/api/v1/workspaces/" + wsId + "/projects/" + projId + "/git";
        mvc.perform(delete(base + "/branches").param("name", "feature/auth/oauth"))
            .andExpect(status().isNoContent());
        verify(gitHub).deleteBranch(anyString(), eq("acme"), eq("repo-a"), eq("feature/auth/oauth"));

        mvc.perform(delete(base + "/branches").param("name", "../escape"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_GIT_BRANCH"));
    }

    @Test
    void reconnectPurgesPreviousRepoCommitCache() {
        seedRepo("acme", "repo-a");
        var commitA = new GitCommitDto("aaa111", "from A", "Alice", "a@t", Instant.now(), 1, 1, 0, null);
        when(gitHub.listCommits(anyString(), eq("acme"), eq("repo-a"), eq("main"), anyInt())).thenReturn(List.of(commitA));
        assertEquals("aaa111", historySvc.listCommits(scope, "main", 30).getFirst().sha());
        assertEquals(1, commitStore.size());

        seedRepo("beta", "repo-b");
        assertTrue(commitStore.isEmpty());
        var commitB = new GitCommitDto("bbb222", "from B", "Bob", "b@t", Instant.now(), 1, 2, 0, null);
        when(gitHub.listCommits(anyString(), eq("beta"), eq("repo-b"), eq("main"), anyInt())).thenReturn(List.of(commitB));
        assertEquals("bbb222", historySvc.listCommits(scope, "main", 30).getFirst().sha());
    }

    @Test
    void fileWritesAndPrMergeInvalidateBranchCommitCache() {
        seedRepo("acme", "repo-a");
        var c1 = new GitCommitDto("c1", "init", "Alice", null, Instant.now(), 1, 1, 0, null);
        var c2 = new GitCommitDto("c2", "after upsert", "Alice", null, Instant.now(), 1, 1, 0, null);
        var c3 = new GitCommitDto("c3", "after delete", "Alice", null, Instant.now(), 1, 0, 1, null);
        var c4 = new GitCommitDto("c4", "after merge", "Alice", null, Instant.now(), 1, 5, 0, null);
        when(gitHub.listCommits(anyString(), eq("acme"), eq("repo-a"), eq("main"), anyInt()))
            .thenReturn(List.of(c1), List.of(c2), List.of(c3), List.of(c4));
        when(gitHub.upsertFile(anyString(), eq("acme"), eq("repo-a"), any())).thenReturn(new GitMutationResultDto(null, c2));
        when(gitHub.deleteFile(anyString(), eq("acme"), eq("repo-a"), any())).thenReturn(new GitMutationResultDto(null, c3));
        when(gitHub.mergePullRequest(anyString(), eq("acme"), eq("repo-a"), eq(5), any())).thenReturn(
            new GitPullRequestDto(5, "PR", "body", "alice", "feat/x", "main", "merged", Instant.now(), null));

        assertEquals("c1", historySvc.listCommits(scope, "main", 30).getFirst().sha());
        contentSvc.upsertFile(scope, new UpsertGitFileRequest("main", "a.txt", "hi", "add", null));
        assertEquals("c2", historySvc.listCommits(scope, "main", 30).getFirst().sha());
        contentSvc.deleteFile(scope, new DeleteGitFileRequest("main", "a.txt", "sha1", "rm"));
        assertEquals("c3", historySvc.listCommits(scope, "main", 30).getFirst().sha());
        historySvc.mergePullRequest(scope, 5, new MergeGitPullRequest(null, "squash"));
        assertEquals("c4", historySvc.listCommits(scope, "main", 30).getFirst().sha());
        verify(gitHub, times(4)).listCommits(anyString(), eq("acme"), eq("repo-a"), eq("main"), anyInt());
    }

    @Test
    void commitCacheExpiresAfterTtlAndResyncs() {
        seedRepo("acme", "repo-a");
        var oldCommit = new GitCommitDto("old1", "old", "Alice", null, Instant.now(), 1, 1, 0, null);
        var freshCommit = new GitCommitDto("new2", "fresh", "Alice", null, Instant.now(), 1, 3, 0, null);
        when(gitHub.listCommits(anyString(), eq("acme"), eq("repo-a"), eq("main"), anyInt()))
            .thenReturn(List.of(oldCommit), List.of(freshCommit));

        assertEquals("old1", historySvc.listCommits(scope, "main", 30).getFirst().sha());
        assertEquals("old1", historySvc.listCommits(scope, "main", 30).getFirst().sha());
        verify(gitHub, times(1)).listCommits(anyString(), eq("acme"), eq("repo-a"), eq("main"), anyInt());

        commitStore.forEach(row -> row.setSyncedAt(Instant.now().minus(Duration.ofMinutes(6))));
        assertEquals("new2", historySvc.listCommits(scope, "main", 30).getFirst().sha());
        verify(gitHub, times(2)).listCommits(anyString(), eq("acme"), eq("repo-a"), eq("main"), anyInt());
    }

    private void seedRepo(String owner, String name) {
        when(gitHub.getRepository(anyString(), eq(owner), eq(name))).thenReturn(
            new GitHubRemoteRepoDto(owner, name, owner + "/" + name, "main", true,
                "https://github.com/" + owner + "/" + name + ".git",
                "https://github.com/" + owner + "/" + name, "desc"));
        repoSvc.connectRepository(scope, userId, new ConnectGitRepoRequest("ghp_1234567890", owner, name, "main"));
    }
}
