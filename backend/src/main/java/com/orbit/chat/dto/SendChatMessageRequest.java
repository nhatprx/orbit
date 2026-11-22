package com.orbit.chat.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

/** Content length and blank checks live in the service so REST and STOMP share one rule. */
public record SendChatMessageRequest(
    @NotNull(message = "Message content is required.") String content,
    UUID replyToId,
    String attachmentName,
    String attachmentUrl,
    List<ChatAttachmentDto> attachments
) {
    public SendChatMessageRequest(String content) {
        this(content, null, null, null, null);
    }

    public SendChatMessageRequest(String content, UUID replyToId, String attachmentName, String attachmentUrl) {
        this(content, replyToId, attachmentName, attachmentUrl, null);
    }
}
