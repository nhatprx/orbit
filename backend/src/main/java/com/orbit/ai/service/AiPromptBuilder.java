package com.orbit.ai.service;

import com.orbit.ai.entity.AiMessageEntity;
import com.orbit.ai.entity.AiThreadEntity;
import com.orbit.ai.gateway.LlmModels.LlmMessage;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class AiPromptBuilder {

    public String buildSystemPrompt(AiThreadEntity thread, List<String> memories, boolean webSearchEnabled) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are Orbit AI, the intelligent assistant embedded inside the Orbit Developer Workspace Platform.\n");
        sb.append("Rules:\n");
        sb.append("- Be concise, accurate, and actionable. Suggest clear next steps when helpful.\n");
        sb.append("- Use available tools to inspect the user's workspace, projects, cloud files, and chat context before guessing.\n");
        sb.append("- Never fabricate file contents or workspace records.\n");
        sb.append("- Active scope: ").append(thread.getScopeType().name());
        if (thread.getWorkspaceId() != null) sb.append(" (workspaceId=").append(thread.getWorkspaceId()).append(")");
        if (thread.getProjectId() != null) sb.append(" (projectId=").append(thread.getProjectId()).append(")");
        sb.append(".\n");
        if (webSearchEnabled) {
            sb.append("- External web search is enabled when up-to-date public information is needed.\n");
        }
        if (thread.getRollingSummary() != null && !thread.getRollingSummary().isBlank()) {
            sb.append("\nConversation summary so far:\n").append(thread.getRollingSummary()).append("\n");
        }
        if (memories != null && !memories.isEmpty()) {
            sb.append("\nRecalled long-term memories:\n");
            for (String mem : memories) {
                sb.append("- ").append(mem).append("\n");
            }
        }
        return sb.toString();
    }

    public List<LlmMessage> buildHistoryWindow(List<AiMessageEntity> recentNewestFirst) {
        List<LlmMessage> messages = new ArrayList<>();
        for (int i = recentNewestFirst.size() - 1; i >= 0; i--) {
            AiMessageEntity msg = recentNewestFirst.get(i);
            if ("assistant".equals(msg.getRole())) {
                messages.add(LlmMessage.assistant(msg.getContent(), List.of()));
            } else {
                messages.add(LlmMessage.user(msg.getContent()));
            }
        }
        return messages;
    }

    public String updateRollingSummary(String existing, String userPrompt, String assistantReply) {
        String snippet = "User asked: " + truncate(userPrompt, 140)
            + " | Assistant answered: " + truncate(assistantReply, 180);
        if (existing == null || existing.isBlank()) return snippet;
        String combined = existing + "\n" + snippet;
        return combined.length() > 1600 ? combined.substring(combined.length() - 1600) : combined;
    }

    private String truncate(String text, int max) {
        if (text == null) return "";
        String flat = text.replaceAll("\\s+", " ").trim();
        return flat.length() <= max ? flat : flat.substring(0, max) + "...";
    }
}
