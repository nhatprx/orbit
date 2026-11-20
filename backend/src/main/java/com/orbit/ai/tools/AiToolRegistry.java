package com.orbit.ai.tools;

import com.orbit.ai.gateway.LlmModels.LlmToolSpec;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class AiToolRegistry {

    private final OrbitWorkspaceTools workspaceTools;
    private final OrbitCloudFileTools cloudFileTools;
    private final ExternalWebSearchTool webSearchTool;

    public AiToolRegistry(
        OrbitWorkspaceTools workspaceTools,
        OrbitCloudFileTools cloudFileTools,
        ExternalWebSearchTool webSearchTool
    ) {
        this.workspaceTools = workspaceTools;
        this.cloudFileTools = cloudFileTools;
        this.webSearchTool = webSearchTool;
    }

    public List<LlmToolSpec> specsFor(AiToolContext ctx) {
        List<LlmToolSpec> specs = new ArrayList<>();
        specs.add(new LlmToolSpec(
            "get_workspace_overview",
            "Get details, enabled modules, and projects of the current Orbit workspace.",
            Map.of("type", "object", "properties", Map.of())
        ));
        specs.add(new LlmToolSpec(
            "list_projects",
            "List all Orbit projects the current user has access to.",
            Map.of("type", "object", "properties", Map.of())
        ));
        specs.add(new LlmToolSpec(
            "search_cloud_files",
            "Search uploaded Cloud Files in the active scope by file name or leave query empty to list recent files.",
            Map.of(
                "type", "object",
                "properties", Map.of("query", Map.of("type", "string", "description", "Optional search keyword"))
            )
        ));
        specs.add(new LlmToolSpec(
            "read_cloud_file",
            "Read text content (up to 64KB) of a Cloud File by its UUID returned from search_cloud_files.",
            Map.of(
                "type", "object",
                "properties", Map.of("fileId", Map.of("type", "string", "description", "Cloud file UUID")),
                "required", List.of("fileId")
            )
        ));
        specs.add(new LlmToolSpec(
            "search_chat_history",
            "Read recent team chat messages in the current workspace or project channel.",
            Map.of(
                "type", "object",
                "properties", Map.of("limit", Map.of("type", "integer", "description", "Number of messages (1-20)"))
            )
        ));
        if (ctx.webSearchEnabled()) {
            specs.add(new LlmToolSpec(
                "web_search",
                "Search the public web for up-to-date documentation, news, or external references.",
                Map.of(
                    "type", "object",
                    "properties", Map.of("query", Map.of("type", "string", "description", "Search query")),
                    "required", List.of("query")
                )
            ));
        }
        return specs;
    }

    public AiToolResult execute(AiToolContext ctx, String name, Map<String, Object> args) {
        try {
            return switch (name) {
                case "get_workspace_overview" -> workspaceTools.getWorkspaceOverview(ctx);
                case "list_projects" -> workspaceTools.listUserProjects(ctx);
                case "search_cloud_files" -> cloudFileTools.searchFiles(ctx, str(args.get("query")));
                case "read_cloud_file" -> cloudFileTools.readFile(ctx, str(args.get("fileId")));
                case "search_chat_history" -> workspaceTools.getRecentChatContext(ctx, intVal(args.get("limit"), 12));
                case "web_search" -> ctx.webSearchEnabled()
                    ? webSearchTool.search(str(args.get("query")))
                    : AiToolResult.text("Web search is disabled for this request.", "Disabled");
                default -> AiToolResult.text("Unknown tool: " + name, "Unknown tool");
            };
        } catch (Exception ex) {
            return AiToolResult.text("Tool '" + name + "' failed: " + ex.getMessage(), "Permission or tool error");
        }
    }

    private String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private int intVal(Object value, int fallback) {
        if (value instanceof Number n) return n.intValue();
        try {
            return value != null ? Integer.parseInt(String.valueOf(value)) : fallback;
        } catch (Exception ex) {
            return fallback;
        }
    }
}
