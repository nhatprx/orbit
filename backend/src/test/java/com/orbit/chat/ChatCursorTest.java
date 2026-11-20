package com.orbit.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.orbit.chat.service.ChatCursorAccess;
import com.orbit.common.ApiException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ChatCursorTest {

    @Test
    void roundTripKeepsMicrosecondPrecision() {
        Instant createdAt = Instant.parse("2026-11-20T03:04:05.123456Z");
        UUID id = UUID.randomUUID();

        String encoded = ChatCursorAccess.encode(createdAt, id);
        var decoded = ChatCursorAccess.decode(encoded);

        assertEquals(createdAt, decoded.createdAt());
        assertEquals(id, decoded.id());
    }

    @Test
    void malformedCursorsAreRejectedWithAClientError() {
        String notBase64 = "%%%";
        String noSeparator = Base64.getUrlEncoder().withoutPadding().encodeToString("12345".getBytes(StandardCharsets.UTF_8));
        String badId = Base64.getUrlEncoder().withoutPadding().encodeToString("123:not-a-uuid".getBytes(StandardCharsets.UTF_8));
        String badNumber = Base64.getUrlEncoder().withoutPadding().encodeToString(("abc:" + UUID.randomUUID()).getBytes(StandardCharsets.UTF_8));

        for (String cursor : new String[] {notBase64, noSeparator, badId, badNumber, ""}) {
            ApiException ex = assertThrows(ApiException.class, () -> ChatCursorAccess.decode(cursor), cursor);
            assertEquals("INVALID_CURSOR", ex.getCode());
        }
    }
}
