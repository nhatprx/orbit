package com.orbit.chat.service;

import java.time.Instant;
import java.util.UUID;

/** Public seam over the package-private {@link ChatCursor}, used by tests and tooling. */
public final class ChatCursorAccess {

    public record Decoded(Instant createdAt, UUID id) {}

    private ChatCursorAccess() {}

    public static String encode(Instant createdAt, UUID id) {
        return ChatCursor.encode(createdAt, id);
    }

    public static Decoded decode(String cursor) {
        ChatCursor decoded = ChatCursor.decode(cursor);
        return new Decoded(decoded.createdAt(), decoded.id());
    }
}
