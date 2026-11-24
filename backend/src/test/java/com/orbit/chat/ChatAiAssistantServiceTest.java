package com.orbit.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.chat.dto.ChatMessageDto;
import com.orbit.chat.entity.ChatChannelEntity;
import com.orbit.chat.entity.ChatMessageEntity;
import com.orbit.chat.repository.ChatMessageRepository;
import com.orbit.chat.service.ChatAiAssistantService;
import com.orbit.chat.service.ChatBroadcaster;
import com.orbit.common.ApiException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class ChatAiAssistantServiceTest {

    @Test
    void detectsAiMentionWithWordBoundariesOnly() {
        assertTrue(ChatAiAssistantService.mentionsAi("@ai summarize our discussion"));
        assertTrue(ChatAiAssistantService.mentionsAi("Hey @AI what do you think?"));
        assertFalse(ChatAiAssistantService.mentionsAi("Send to alice@ai.com"));
        assertFalse(ChatAiAssistantService.mentionsAi("@aiden please review"));
        assertFalse(ChatAiAssistantService.mentionsAi("Normal message"));
    }

    @Test
    void repliesWithChannelContextAndBroadcastsAsOrbitAi() {
        ChatMessageRepository messages = mock(ChatMessageRepository.class);
        UserRepository users = mock(UserRepository.class);
        AiProviderConfigService aiConfig = mock(AiProviderConfigService.class);
        LlmGatewayRouter gateway = mock(LlmGatewayRouter.class);
        List<ChatMessageDto> broadcasts = new ArrayList<>();
        ChatBroadcaster broadcaster = broadcasts::add;

        UUID channelId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        UserEntity requester = new UserEntity();
        requester.setId(userId);
        requester.setUsername("nhatprx");
        requester.setDisplayName("Minh Nhat");
        requester.setEmail("nhat@orbit.dev");

        UserEntity bot = new UserEntity();
        bot.setId(UUID.randomUUID());
        bot.setUsername("ai");
        bot.setDisplayName("Orbit AI");
        bot.setEmail("ai@orbit.local");
        when(users.findByUsernameIgnoreCase("ai")).thenReturn(Optional.of(bot));

        ChatChannelEntity channel = mock(ChatChannelEntity.class);
        when(channel.getId()).thenReturn(channelId);
        when(channel.getName()).thenReturn("architecture");

        ChatMessageDto prior = new ChatMessageDto(
            UUID.randomUUID(), channelId, userId, "Minh Nhat", "nhatprx",
            "I think we should use PostgreSQL for durability.", null, null, null, null, null, Instant.now()
        );
        ChatMessageDto trigger = new ChatMessageDto(
            UUID.randomUUID(), channelId, userId, "Minh Nhat", "nhatprx",
            "@ai what are the viewpoints so far?", null, null, null, null, null, Instant.now()
        );

        when(messages.findLatest(any(), any())).thenReturn(List.of(trigger, prior));
        AiProviderConfigEntity cfg = new AiProviderConfigEntity();
        cfg.setActiveProvider(AiProviderType.OPENROUTER);
        cfg.setProModel("google/gemini-2.5-flash");
        when(aiConfig.getActiveEntity()).thenReturn(cfg);
        when(gateway.complete(any(), any(), any())).thenReturn(
            new LlmResponse("Minh Nhat favors PostgreSQL for durability.", List.of(), 40, 12)
        );
        when(messages.save(any(ChatMessageEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        ChatAiAssistantService service = new ChatAiAssistantService(
            messages, users, broadcaster, aiConfig, gateway, null
        );
        service.replySync(channel, requester, trigger);

        ArgumentCaptor<LlmRequest> reqCap = ArgumentCaptor.forClass(LlmRequest.class);
        verify(gateway).complete(any(), reqCap.capture(), any());
        assertTrue(reqCap.getValue().messages().getFirst().content().contains("PostgreSQL for durability"));

        assertEquals(1, broadcasts.size());
        assertEquals("Orbit AI", broadcasts.getFirst().senderName());
        assertEquals("ai", broadcasts.getFirst().senderUsername());
        assertEquals(trigger.id(), broadcasts.getFirst().replyToId());
        assertTrue(broadcasts.getFirst().content().contains("PostgreSQL"));
    }

    @Test
    void postsFriendlyFallbackWhenProviderFails() {
        ChatMessageRepository messages = mock(ChatMessageRepository.class);
        UserRepository users = mock(UserRepository.class);
        AiProviderConfigService aiConfig = mock(AiProviderConfigService.class);
        LlmGatewayRouter gateway = mock(LlmGatewayRouter.class);
        List<ChatMessageDto> broadcasts = new ArrayList<>();
        ChatBroadcaster broadcaster = broadcasts::add;

        UserEntity requester = new UserEntity();
        requester.setId(UUID.randomUUID());
        requester.setUsername("nhatprx");
        requester.setDisplayName("Minh Nhat");

        UserEntity bot = new UserEntity();
        bot.setId(UUID.randomUUID());
        bot.setUsername("ai");
        bot.setDisplayName("Orbit AI");
        when(users.findByUsernameIgnoreCase("ai")).thenReturn(Optional.of(bot));

        UUID channelId = UUID.randomUUID();
        ChatChannelEntity channel = mock(ChatChannelEntity.class);
        when(channel.getId()).thenReturn(channelId);
        when(channel.getName()).thenReturn("general");

        ChatMessageDto trigger = new ChatMessageDto(
            UUID.randomUUID(), channelId, requester.getId(), "Minh Nhat", "nhatprx",
            "@ai hello", null, null, null, null, null, Instant.now()
        );

        when(aiConfig.getActiveEntity()).thenThrow(ApiException.badRequest("AI_NOT_CONFIGURED", "API key missing."));
        when(messages.save(any(ChatMessageEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        ChatAiAssistantService service = new ChatAiAssistantService(
            messages, users, broadcaster, aiConfig, gateway, null
        );
        service.replySync(channel, requester, trigger);

        assertEquals(1, broadcasts.size());
        assertTrue(broadcasts.getFirst().content().contains("API key missing."));
    }
}
