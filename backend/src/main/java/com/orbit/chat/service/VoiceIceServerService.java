package com.orbit.chat.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.chat.dto.VoiceIceServerDto;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Parses configured WebRTC ICE/TURN server definitions with a safe STUN default. */
@Service
public class VoiceIceServerService {

    public static final String DEFAULT_STUN_URL = "stun:stun.l.google.com:19302";
    private static final Logger LOG = LoggerFactory.getLogger(VoiceIceServerService.class);

    private final List<VoiceIceServerDto> servers;

    public VoiceIceServerService(
        ObjectMapper mapper,
        @Value("${orbit.chat.voice.ice-servers:" + DEFAULT_STUN_URL + "}") String rawConfig
    ) {
        this.servers = List.copyOf(parse(mapper, rawConfig));
    }

    public List<VoiceIceServerDto> getIceServers() {
        return servers;
    }

    static List<VoiceIceServerDto> parse(ObjectMapper mapper, String rawConfig) {
        if (rawConfig == null || rawConfig.isBlank()) {
            return defaultList();
        }
        String trimmed = rawConfig.trim();
        List<VoiceIceServerDto> parsed = trimmed.startsWith("[")
            ? parseJsonArray(mapper, trimmed)
            : parseCsv(trimmed);
        return parsed.isEmpty() ? defaultList() : parsed;
    }

    private static List<VoiceIceServerDto> parseJsonArray(ObjectMapper mapper, String json) {
        List<VoiceIceServerDto> result = new ArrayList<>();
        try {
            JsonNode root = mapper.readTree(json);
            if (!root.isArray()) return result;
            for (JsonNode item : root) {
                VoiceIceServerDto dto = parseJsonItem(item);
                if (dto != null) result.add(dto);
            }
        } catch (JsonProcessingException ex) {
            LOG.warn("Invalid JSON in orbit.chat.voice.ice-servers, falling back to default STUN: {}", ex.getMessage());
        }
        return result;
    }

    private static VoiceIceServerDto parseJsonItem(JsonNode item) {
        if (item == null || item.isNull()) return null;
        if (item.isTextual()) {
            String url = normalizeUrl(item.asText());
            return url == null ? null : new VoiceIceServerDto(List.of(url));
        }
        if (!item.isObject()) return null;
        List<String> urls = extractUrls(item.get("urls"));
        if (urls.isEmpty()) return null;
        String username = optionalText(item.get("username"));
        String credential = optionalText(item.get("credential"));
        return new VoiceIceServerDto(urls, username, credential);
    }

    private static List<String> extractUrls(JsonNode urlsNode) {
        List<String> urls = new ArrayList<>();
        if (urlsNode == null || urlsNode.isNull()) return urls;
        if (urlsNode.isTextual()) {
            String url = normalizeUrl(urlsNode.asText());
            if (url != null) urls.add(url);
        } else if (urlsNode.isArray()) {
            for (JsonNode entry : urlsNode) {
                if (entry.isTextual()) {
                    String url = normalizeUrl(entry.asText());
                    if (url != null) urls.add(url);
                }
            }
        }
        return urls;
    }

    private static List<VoiceIceServerDto> parseCsv(String raw) {
        List<VoiceIceServerDto> result = new ArrayList<>();
        for (String part : raw.split(",")) {
            String url = normalizeUrl(part);
            if (url != null) result.add(new VoiceIceServerDto(List.of(url)));
        }
        return result;
    }

    private static String normalizeUrl(String raw) {
        if (raw == null) return null;
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) return null;
        String lower = trimmed.toLowerCase(Locale.ROOT);
        if (lower.startsWith("stun:") || lower.startsWith("stuns:")
            || lower.startsWith("turn:") || lower.startsWith("turns:")) {
            return trimmed;
        }
        return null;
    }

    private static String optionalText(JsonNode node) {
        if (node == null || !node.isTextual()) return null;
        String trimmed = node.asText().trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static List<VoiceIceServerDto> defaultList() {
        return List.of(new VoiceIceServerDto(List.of(DEFAULT_STUN_URL)));
    }
}
