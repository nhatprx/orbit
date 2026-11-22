package com.orbit.chat.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.chat.dto.ChatAttachmentDto;
import com.orbit.common.ApiException;
import com.orbit.storage.service.StorageService;
import java.util.ArrayList;
import java.util.List;

/** Validates, encodes, decodes, and resolves multi-attachment payloads on chat messages. */
public final class ChatAttachmentCodec {

    public static final int MAX_ATTACHMENTS = 10;
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<List<ChatAttachmentDto>> LIST_TYPE = new TypeReference<>() {};

    private ChatAttachmentCodec() {}

    public static List<ChatAttachmentDto> validateList(
        List<ChatAttachmentDto> rawList, String legacyName, String legacyUrl
    ) {
        if (rawList != null && !rawList.isEmpty()) {
            if (rawList.size() > MAX_ATTACHMENTS) {
                throw ApiException.badRequest("VALIDATION_ERROR", "At most 10 attachments per message are allowed.");
            }
            List<ChatAttachmentDto> clean = new ArrayList<>(rawList.size());
            for (ChatAttachmentDto item : rawList) {
                if (item == null) continue;
                String url = ChatMessageValidator.validateAttachmentUrl(item.url());
                if (url == null) continue;
                String name = ChatMessageValidator.validateAttachmentName(item.name());
                clean.add(new ChatAttachmentDto(name != null ? name : "attachment", url));
            }
            return List.copyOf(clean);
        }
        String url = ChatMessageValidator.validateAttachmentUrl(legacyUrl);
        if (url == null) return List.of();
        String name = ChatMessageValidator.validateAttachmentName(legacyName);
        return List.of(new ChatAttachmentDto(name != null ? name : url, url));
    }

    public static String encode(List<ChatAttachmentDto> attachments) {
        if (attachments == null || attachments.isEmpty()) return null;
        try {
            return MAPPER.writeValueAsString(attachments);
        } catch (Exception ex) {
            return null;
        }
    }

    public static List<ChatAttachmentDto> decode(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            List<ChatAttachmentDto> parsed = MAPPER.readValue(json, LIST_TYPE);
            return parsed == null ? List.of() : List.copyOf(parsed);
        } catch (Exception ex) {
            return List.of();
        }
    }

    public static List<ChatAttachmentDto> resolve(StorageService storage, List<ChatAttachmentDto> attachments) {
        if (attachments == null || attachments.isEmpty()) return List.of();
        return attachments.stream()
            .map(a -> new ChatAttachmentDto(a.name(), ChatImageService.resolveAttachmentUrl(storage, a.url())))
            .toList();
    }
}
