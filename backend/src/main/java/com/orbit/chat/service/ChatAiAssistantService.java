package com.orbit.chat.service;

import com.orbit.ai.entity.AiProviderConfigEntity;
import com.orbit.ai.gateway.LlmGatewayRouter;
import com.orbit.ai.gateway.LlmModels.LlmMessage;
import com.orbit.ai.gateway.LlmModels.LlmRequest;
import com.orbit.ai.gateway.LlmModels.LlmResponse;
import com.orbit.ai.service.AiProviderConfigService;
import com.orbit.ai.service.AiUsageService;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.chat.dto.ChatMessageDto;
import com.orbit.chat.dto.ChatTypingDto;
import com.orbit.chat.entity.ChatChannelEntity;
import com.orbit.chat.entity.ChatMessageEntity;
import com.orbit.chat.repository.ChatMessageRepository;
import com.orbit.common.ApiException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

/** Handles @ai mentions inside chat channels by reading recent context and posting an AI reply. */
@Service
public class ChatAiAssistantService {

    private static final Logger log = LoggerFactory.getLogger(ChatAiAssistantService.class);
    private static final Pattern AI_MENTION = Pattern.compile("(?i)(?:^|\\s)@ai\\b");
    private static final int CONTEXT_LIMIT = 30;
    private static final int MAX_REPLY_CHARS = 3800;
    private static final String BOT_USERNAME = "ai";
    private static final String BOT_EMAIL = "ai@orbit.local";
    private static final String BOT_NAME = "Orbit AI";

    private final ChatMessageRepository messages;
    private final UserRepository users;
    private final ChatBroadcaster broadcaster;
    private final AiProviderConfigService aiConfig;
    private final LlmGatewayRouter gatewayRouter;
    private final AiUsageService usageService;

    @Autowired
    public ChatAiAssistantService(
        ChatMessageRepository messages,
        UserRepository users,
        ChatBroadcaster broadcaster,
        AiProviderConfigService aiConfig,
        LlmGatewayRouter gatewayRouter,
        @Autowired(required = false) AiUsageService usageService
    ) {
        this.messages = messages;
        this.users = users;
        this.broadcaster = broadcaster;
        this.aiConfig = aiConfig;
        this.gatewayRouter = gatewayRouter;
        this.usageService = usageService;
    }

    public static boolean mentionsAi(String content) {
        return content != null && AI_MENTION.matcher(content).find();
    }

    public void maybeReplyAsync(ChatChannelEntity channel, UserEntity requester, ChatMessageDto trigger) {
        if (trigger == null || !mentionsAi(trigger.content())) return;
        if (BOT_USERNAME.equalsIgnoreCase(requester.getUsername())) return;
        Thread.startVirtualThread(() -> replySync(channel, requester, trigger));
    }

    public void replySync(ChatChannelEntity channel, UserEntity requester, ChatMessageDto trigger) {
        UserEntity bot = ensureBotUser();
        broadcaster.broadcastTyping(ChatTypingDto.of(channel.getId(), bot.getId(), BOT_NAME, true));
        try {
            String answer = generateReply(channel, requester, trigger);
            persistAndBroadcast(channel.getId(), bot, requester, trigger, answer);
        } catch (ApiException ex) {
            log.warn("Chat @ai request failed for channel {}: {}", channel.getId(), ex.getMessage());
            persistAndBroadcast(channel.getId(), bot, requester, trigger, "Orbit AI could not respond: " + ex.getMessage());
        } catch (Exception ex) {
            log.warn("Chat @ai unexpected failure for channel {}: {}", channel.getId(), ex.getMessage());
            persistAndBroadcast(channel.getId(), bot, requester, trigger,
                "Orbit AI is currently unavailable. Please check the AI provider configuration in Admin settings.");
        } finally {
            broadcaster.broadcastTyping(ChatTypingDto.of(channel.getId(), bot.getId(), BOT_NAME, false));
        }
    }

    private String generateReply(ChatChannelEntity channel, UserEntity requester, ChatMessageDto trigger) {
        AiProviderConfigEntity cfg = aiConfig.getActiveEntity();
        String modelId = cfg.getProModel() != null && !cfg.getProModel().isBlank()
            ? cfg.getProModel() : cfg.getFastModel();
        AiUsageService.ResolvedKey key = usageService != null
            ? usageService.checkBudgetAndResolveKey(requester.getId())
            : new AiUsageService.ResolvedKey(null, "SYSTEM");

        List<ChatMessageDto> recent = new ArrayList<>(
            messages.findLatest(channel.getId(), PageRequest.of(0, CONTEXT_LIMIT))
        );
        Collections.reverse(recent);
        String transcript = buildTranscript(recent);
        String systemPrompt = """
            You are Orbit AI, an engineering and team discussion assistant participating in chat channel #%s.
            Analyze the recent channel messages below and answer the user's @ai request directly.
            When asked about opinions, viewpoints, or decisions in the chat, cite the participants by name,
            summarize each viewpoint fairly, highlight agreements/tensions, and give a clear recommendation.
            Respond in the same language as the user's message. Keep the response concise and readable (no emojis).
            """.formatted(channel.getName());

        String userPrompt = "Recent channel conversation:\n" + transcript
            + "\n\nCurrent request from " + requester.getDisplayName() + " (@" + requester.getUsername() + "):\n"
            + trigger.content();

        LlmRequest req = new LlmRequest(
            modelId, cfg.getBedrockRegion(), systemPrompt,
            List.of(LlmMessage.user(userPrompt)), List.of(), false, 1200, key.apiKeyOverride()
        );
        LlmResponse resp = gatewayRouter.complete(cfg, req, null);
        if (usageService != null && (resp.inputTokens() > 0 || resp.outputTokens() > 0)) {
            usageService.recordUsage(
                requester.getId(), null, null, cfg.getActiveProvider().name(), modelId,
                resp.generationId(), resp.inputTokens(), resp.outputTokens(), resp.costUsd(), key.keySource()
            );
        }
        String text = resp.content() == null ? "" : resp.content().trim();
        if (text.isEmpty()) return "I did not have enough context to generate an answer.";
        return text.length() > MAX_REPLY_CHARS ? text.substring(0, MAX_REPLY_CHARS) + "..." : text;
    }

    static String buildTranscript(List<ChatMessageDto> chronological) {
        if (chronological == null || chronological.isEmpty()) return "(no prior messages)";
        StringBuilder sb = new StringBuilder();
        for (ChatMessageDto m : chronological) {
            if (m.deletedAt() != null) continue;
            String body = m.content() != null && !m.content().isBlank()
                ? m.content().trim()
                : (m.attachmentName() != null ? "[Attachment: " + m.attachmentName() + "]" : "");
            if (body.isEmpty()) continue;
            sb.append('[').append(m.senderName()).append(" (@").append(m.senderUsername()).append(")]: ")
                .append(body).append('\n');
        }
        return sb.isEmpty() ? "(no prior messages)" : sb.toString().trim();
    }

    private void persistAndBroadcast(
        UUID channelId, UserEntity bot, UserEntity requester, ChatMessageDto trigger, String text
    ) {
        String senderName = ChatMessageValidator.formatReplySender(requester.getDisplayName());
        String snippet = ChatMessageValidator.formatReplySnippet(trigger.content());
        ChatMessageEntity entity = new ChatMessageEntity(
            channelId, bot.getId(), text, trigger.id(), senderName, snippet, null, null
        );
        ChatMessageEntity saved = messages.save(entity);
        ChatMessageDto dto = new ChatMessageDto(
            saved.getId(), channelId, bot.getId(), BOT_NAME, BOT_USERNAME,
            saved.getContent(), saved.getReplyToId(), saved.getReplyToSenderName(),
            saved.getReplyToSnippet(), null, null, saved.getCreatedAt(), null,
            List.of(), null, false, null, null, List.of()
        );
        broadcaster.broadcast(dto);
    }

    private synchronized UserEntity ensureBotUser() {
        return users.findByUsernameIgnoreCase(BOT_USERNAME)
            .or(() -> users.findByEmailIgnoreCase(BOT_EMAIL))
            .orElseGet(() -> {
                UserEntity bot = new UserEntity();
                bot.setId(UUID.randomUUID());
                bot.setUsername(BOT_USERNAME);
                bot.setEmail(BOT_EMAIL);
                bot.setDisplayName(BOT_NAME);
                bot.setRole("bot");
                return users.save(bot);
            });
    }
}
