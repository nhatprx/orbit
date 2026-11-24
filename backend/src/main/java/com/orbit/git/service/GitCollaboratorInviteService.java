package com.orbit.git.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.auth.entity.OAuthAccountEntity;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.OAuthAccountRepository;
import com.orbit.auth.repository.UserRepository;
import com.orbit.common.ApiException;
import com.orbit.git.client.GitHubInsightsClient;
import com.orbit.git.config.GitProperties;
import com.orbit.git.dto.GitCollaboratorDto;
import com.orbit.git.entity.GitRepositoryEntity;
import com.orbit.workspace.entity.WorkspaceMemberEntity;
import com.orbit.workspace.repository.WorkspaceMemberRepository;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/** Lists workspace members with GitHub link status and sends GitHub collaborator invitations. */
@Service
public class GitCollaboratorInviteService {

    public record WorkspaceMemberCandidateDto(
        UUID userId,
        String displayName,
        String email,
        String avatarUrl,
        boolean githubLinked,
        String githubUsername,
        boolean alreadyCollaborator
    ) {}

    public record InviteCollaboratorRequest(String githubUsername, String permission) {}

    public record InviteCollaboratorResultDto(String githubUsername, String permission, String status) {}

    private static final Set<String> ALLOWED_PERMS = Set.of("pull", "push", "maintain", "admin", "triage");

    private final GitRepositoryService repoService;
    private final GitHubInsightsClient insightsClient;
    private final WorkspaceMemberRepository memberRepo;
    private final UserRepository userRepo;
    private final OAuthAccountRepository oauthRepo;
    private final GitProperties properties;
    private final ObjectMapper mapper;
    private final HttpClient httpClient;

    public GitCollaboratorInviteService(
        GitRepositoryService repoService, GitHubInsightsClient insightsClient,
        WorkspaceMemberRepository memberRepo, UserRepository userRepo,
        OAuthAccountRepository oauthRepo, GitProperties properties, ObjectMapper mapper
    ) {
        this.repoService = repoService;
        this.insightsClient = insightsClient;
        this.memberRepo = memberRepo;
        this.userRepo = userRepo;
        this.oauthRepo = oauthRepo;
        this.properties = properties;
        this.mapper = mapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(properties.getRequestTimeoutSeconds())).build();
    }

    public List<WorkspaceMemberCandidateDto> listWorkspaceCandidates(GitScope scope) {
        GitRepositoryEntity repo = repoService.requireEntity(scope);
        String token = repoService.decryptToken(repo);
        List<WorkspaceMemberEntity> members = memberRepo.findByIdWorkspaceId(scope.workspaceId());
        if (members.isEmpty()) return List.of();

        List<UUID> userIds = members.stream().map(m -> m.getId().userId()).distinct().toList();
        Map<UUID, UserEntity> usersById = new HashMap<>();
        for (UserEntity u : userRepo.findAllById(userIds)) usersById.put(u.getId(), u);

        Map<UUID, OAuthAccountEntity> githubByUser = new HashMap<>();
        for (OAuthAccountEntity acc : oauthRepo.findByUserIdInAndProvider(userIds, "github")) {
            githubByUser.put(acc.getUser().getId(), acc);
        }

        Set<String> existingLogins = new HashSet<>();
        existingLogins.add(repo.getRepoOwner().toLowerCase(Locale.ROOT));
        for (GitCollaboratorDto c : insightsClient.listCollaborators(token, repo.getRepoOwner(), repo.getRepoName())) {
            if (c.login() != null) existingLogins.add(c.login().toLowerCase(Locale.ROOT));
        }

        List<WorkspaceMemberCandidateDto> result = new ArrayList<>();
        for (UUID uid : userIds) {
            UserEntity user = usersById.get(uid);
            if (user == null) continue;
            OAuthAccountEntity gh = githubByUser.get(uid);
            String ghLogin = gh != null ? resolveAndCacheGitHubLogin(gh, token) : null;
            boolean linked = ghLogin != null && !ghLogin.isBlank();
            boolean already = linked && existingLogins.contains(ghLogin.toLowerCase(Locale.ROOT));
            String avatarUrl = linked ? "https://github.com/" + encode(ghLogin) + ".png?size=64" : null;
            result.add(new WorkspaceMemberCandidateDto(
                uid, user.getDisplayName(), user.getEmail(), avatarUrl, linked, ghLogin, already
            ));
        }
        result.sort(Comparator.comparing(WorkspaceMemberCandidateDto::githubLinked).reversed()
            .thenComparing(WorkspaceMemberCandidateDto::displayName, String.CASE_INSENSITIVE_ORDER));
        return result;
    }

    public InviteCollaboratorResultDto inviteCollaborator(GitScope scope, InviteCollaboratorRequest req) {
        if (req == null || req.githubUsername() == null || req.githubUsername().isBlank()) {
            throw ApiException.badRequest("INVALID_GIT_INPUT", "githubUsername is required.");
        }
        String username = req.githubUsername().trim();
        String perm = (req.permission() != null && ALLOWED_PERMS.contains(req.permission().trim().toLowerCase()))
            ? req.permission().trim().toLowerCase() : "push";
        GitRepositoryEntity repo = repoService.requireEntity(scope);
        String token = repoService.decryptToken(repo);
        String baseUrl = properties.getGithubApiUrl().replaceAll("/+$", "");
        String url = baseUrl + "/repos/" + encode(repo.getRepoOwner()) + "/" + encode(repo.getRepoName())
            + "/collaborators/" + encode(username);
        HttpRequest httpReq = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .timeout(Duration.ofSeconds(properties.getRequestTimeoutSeconds()))
            .header("Authorization", "Bearer " + token)
            .header("Accept", "application/vnd.github+json")
            .header("Content-Type", "application/json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .header("User-Agent", "Orbit-Git-Client")
            .PUT(HttpRequest.BodyPublishers.ofString("{\"permission\":\"" + perm + "\"}"))
            .build();
        try {
            HttpResponse<String> resp = httpClient.send(httpReq, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 204) return new InviteCollaboratorResultDto(username, perm, "ALREADY_COLLABORATOR");
            if (resp.statusCode() >= 200 && resp.statusCode() < 300) {
                return new InviteCollaboratorResultDto(username, perm, "INVITED");
            }
            throw new ApiException(HttpStatus.BAD_GATEWAY, "GITHUB_INVITE_FAILED",
                "GitHub collaborator invite failed with status " + resp.statusCode());
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) Thread.currentThread().interrupt();
            throw new ApiException(HttpStatus.BAD_GATEWAY, "GITHUB_INVITE_FAILED",
                "Failed to invite collaborator on GitHub: " + ex.getMessage());
        }
    }

    private String resolveAndCacheGitHubLogin(OAuthAccountEntity gh, String token) {
        if (gh.getProviderUsername() != null && !gh.getProviderUsername().isBlank()) return gh.getProviderUsername();
        String id = gh.getProviderUserId();
        if (id == null || !id.matches("\\d+")) return gh.getProviderDisplayName();
        try {
            String baseUrl = properties.getGithubApiUrl().replaceAll("/+$", "");
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/user/" + id))
                .timeout(Duration.ofSeconds(6))
                .header("Authorization", "Bearer " + token)
                .header("Accept", "application/vnd.github+json")
                .header("User-Agent", "Orbit-Git-Client")
                .GET().build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 200) {
                JsonNode node = mapper.readTree(resp.body());
                String login = node.path("login").asText("");
                if (!login.isBlank()) {
                    gh.setProviderUsername(login);
                    oauthRepo.save(gh);
                    return login;
                }
            }
        } catch (Exception ignored) { /* fallback below */ }
        return gh.getProviderDisplayName();
    }

    private static String encode(String seg) {
        return URLEncoder.encode(seg, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
