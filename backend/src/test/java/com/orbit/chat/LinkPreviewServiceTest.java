package com.orbit.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.orbit.chat.service.LinkPreviewService;
import com.orbit.common.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class LinkPreviewServiceTest {

    private final LinkPreviewService service = new LinkPreviewService();

    @Test
    void rejectsNonHttpAndBlankUrls() {
        ApiException blank = assertThrows(ApiException.class, () -> service.fetch("  "));
        assertEquals(HttpStatus.BAD_REQUEST, blank.getStatus());
        assertEquals("INVALID_URL", blank.getCode());

        ApiException fileScheme = assertThrows(ApiException.class, () -> service.fetch("file:///etc/passwd"));
        assertEquals("INVALID_URL", fileScheme.getCode());
    }

    @Test
    void blocksPrivateAndLoopbackHostsForSsrfProtection() {
        assertEquals("BLOCKED_HOST", assertThrows(ApiException.class, () -> service.fetch("http://localhost:8080")).getCode());
        assertEquals("BLOCKED_HOST", assertThrows(ApiException.class, () -> service.fetch("http://127.0.0.1/secret")).getCode());
        assertEquals("BLOCKED_HOST", assertThrows(ApiException.class, () -> service.fetch("http://192.168.1.1/admin")).getCode());
        assertEquals("BLOCKED_HOST", assertThrows(ApiException.class, () -> service.fetch("http://169.254.169.254/latest/meta-data")).getCode());
    }
}
