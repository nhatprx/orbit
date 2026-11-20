package com.orbit.ai.tools;

import com.orbit.ai.dto.AiCitationDto;
import com.orbit.ai.entity.AiScopeType;
import com.orbit.cloud.dto.CloudDownloadResponse;
import com.orbit.cloud.entity.CloudNodeEntity;
import com.orbit.cloud.repository.CloudNodeQueryRepository;
import com.orbit.cloud.service.CloudAccessGuard;
import com.orbit.cloud.service.CloudDownloadService;
import com.orbit.cloud.service.CloudScope;
import com.orbit.workspace.permission.Permissions;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** RBAC-enforced Cloud Files search and text reader for Orbit AI. */
@Component
public class OrbitCloudFileTools {

    private static final int MAX_READ_BYTES = 65_536;

    private final CloudAccessGuard accessGuard;
    private final CloudNodeQueryRepository queryRepository;
    private final CloudDownloadService downloadService;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public OrbitCloudFileTools(
        CloudAccessGuard accessGuard,
        CloudNodeQueryRepository queryRepository,
        CloudDownloadService downloadService
    ) {
        this.accessGuard = accessGuard;
        this.queryRepository = queryRepository;
        this.downloadService = downloadService;
    }

    public AiToolResult searchFiles(AiToolContext ctx, String query) {
        CloudScope scope = resolveScope(ctx);
        List<CloudNodeEntity> nodes = queryRepository.findPage(
            scope, null, "ALL", query, "updatedAt", false, null, 15
        );
        if (nodes.isEmpty()) {
            return AiToolResult.text("No matching cloud files found in this scope.", "0 files found");
        }
        StringBuilder sb = new StringBuilder("Matching Cloud Files:\n");
        List<AiCitationDto> citations = new ArrayList<>();
        for (CloudNodeEntity n : nodes) {
            sb.append("- ").append(n.getName())
                .append(" [").append(n.getNodeType()).append("]")
                .append(" (id=").append(n.getId())
                .append(", size=").append(n.getSizeBytes()).append("B");
            if (n.getMimeType() != null) sb.append(", type=").append(n.getMimeType());
            sb.append(")\n");
            citations.add(new AiCitationDto("file", n.getName(), n.getId().toString()));
        }
        return new AiToolResult(sb.toString(), "Found " + nodes.size() + " cloud files", citations);
    }

    public AiToolResult readFile(AiToolContext ctx, String fileIdRaw) {
        if (fileIdRaw == null || fileIdRaw.isBlank()) {
            return AiToolResult.text("A fileId (UUID) is required.", "Missing fileId");
        }
        UUID fileId;
        try {
            fileId = UUID.fromString(fileIdRaw.trim());
        } catch (Exception ex) {
            return AiToolResult.text("Invalid fileId UUID.", "Invalid fileId");
        }

        CloudScope scope = resolveScope(ctx);
        CloudDownloadResponse dl = downloadService.getDownloadUrl(scope, ctx.userId(), fileId);
        if (!isTextReadable(dl.mimeType(), dl.filename())) {
            return new AiToolResult(
                "File '" + dl.filename() + "' (" + dl.mimeType() + ", " + dl.sizeBytes()
                    + " bytes) is binary. Metadata retrieved; full binary parsing is scheduled for Phase B.",
                "Inspected binary file " + dl.filename(),
                List.of(new AiCitationDto("file", dl.filename(), fileId.toString()))
            );
        }

        try {
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(dl.url()))
                .timeout(Duration.ofSeconds(15))
                .GET()
                .build();
            HttpResponse<InputStream> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofInputStream());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                return AiToolResult.text("Unable to download file content (HTTP " + resp.statusCode() + ").", "Read error");
            }
            byte[] bytes;
            try (InputStream in = resp.body()) {
                bytes = in.readNBytes(MAX_READ_BYTES);
            }
            String text = new String(bytes, StandardCharsets.UTF_8);
            boolean truncated = dl.sizeBytes() > MAX_READ_BYTES;
            String output = "File: " + dl.filename() + (truncated ? " (first 64KB shown)\n\n" : "\n\n") + text;
            return new AiToolResult(
                output,
                "Read " + dl.filename(),
                List.of(new AiCitationDto("file", dl.filename(), fileId.toString()))
            );
        } catch (Exception ex) {
            return AiToolResult.text("Failed to read file content: " + ex.getMessage(), "Read error");
        }
    }

    private CloudScope resolveScope(AiToolContext ctx) {
        if (ctx.scopeType() == AiScopeType.PROJECT && ctx.workspaceId() != null && ctx.projectId() != null) {
            return accessGuard.requireProjectScope(ctx.userId(), ctx.workspaceId(), ctx.projectId(), Permissions.PFILES_READ);
        }
        if (ctx.scopeType() == AiScopeType.WORKSPACE && ctx.workspaceId() != null) {
            return accessGuard.requireWorkspaceScope(ctx.userId(), ctx.workspaceId(), Permissions.FILES_READ);
        }
        return accessGuard.requireUserScope(ctx.userId());
    }

    private boolean isTextReadable(String mimeType, String fileName) {
        String mime = mimeType != null ? mimeType.toLowerCase() : "";
        if (mime.startsWith("text/") || mime.contains("json") || mime.contains("xml")
            || mime.contains("yaml") || mime.contains("javascript") || mime.contains("csv")) {
            return true;
        }
        String name = fileName != null ? fileName.toLowerCase() : "";
        return name.endsWith(".md") || name.endsWith(".txt") || name.endsWith(".json")
            || name.endsWith(".yml") || name.endsWith(".yaml") || name.endsWith(".csv")
            || name.endsWith(".java") || name.endsWith(".ts") || name.endsWith(".tsx")
            || name.endsWith(".py") || name.endsWith(".sql") || name.endsWith(".env");
    }
}
