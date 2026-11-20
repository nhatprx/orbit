package com.orbit.chat.service;

import com.orbit.chat.dto.ChatMessageDto;

/** Fans a persisted message out to every connected STOMP subscriber, on every API instance. */
@FunctionalInterface
public interface ChatBroadcaster {

    void broadcast(ChatMessageDto message);
}
