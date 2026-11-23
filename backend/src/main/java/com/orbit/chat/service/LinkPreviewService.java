package com.orbit.chat.service;

import com.orbit.chat.dto.LinkPreviewDto;
import com.orbit.common.ApiException;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class LinkPreviewService {

    private static final int MAX_URL_LEN = 2048;
    private static final int MAX_BODY_BYTES = 200 * 1024;
    private static final int MAX_CACHE_SIZE = 500;
    private static final Duration CACHE_TTL = Duration.ofMinutes(15);

    private final HttpClient http = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(3))
        .followRedirects(HttpClient.Redirect.NORMAL)
        .build();

    private final Map<String, CachedPreview> cache = new ConcurrentHashMap<>();

    private record CachedPreview(LinkPreviewDto dto, Instant expiresAt) {}

    public LinkPreviewDto fetch(String rawUrl) {
        URI uri = parseAndValidate(rawUrl);
        String normalized = uri.toString();
        CachedPreview hit = cache.get(normalized);
        if (hit != null && hit.expiresAt().isAfter(Instant.now())) {
            return hit.dto();
        }
        LinkPreviewDto dto = fetchRemote(uri);
        if (cache.size() >= MAX_CACHE_SIZE) {
            cache.clear();
        }
        cache.put(normalized, new CachedPreview(dto, Instant.now().plus(CACHE_TTL)));
        return dto;
    }

    private URI parseAndValidate(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank() || rawUrl.length() > MAX_URL_LEN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_URL", "A valid http or https URL is required.");
        }
        URI uri;
        try {
            uri = URI.create(rawUrl.trim());
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_URL", "Malformed URL.");
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        String host = uri.getHost();
        if ((!"http".equals(scheme) && !"https".equals(scheme)) || host == null || host.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_URL", "Only http and https URLs are supported.");
        }
        ensurePublicHost(host);
        return uri;
    }

    private void ensurePublicHost(String host) {
        String lower = host.toLowerCase(Locale.ROOT);
        if (lower.equals("localhost") || lower.endsWith(".local") || lower.endsWith(".internal")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "BLOCKED_HOST", "Private hosts are not allowed.");
        }
        try {
            for (InetAddress addr : InetAddress.getAllByName(host)) {
                if (addr.isAnyLocalAddress() || addr.isLoopbackAddress() || addr.isLinkLocalAddress()
                    || addr.isSiteLocalAddress() || addr.isMulticastAddress()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "BLOCKED_HOST", "Private IP addresses are not allowed.");
                }
            }
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "UNRESOLVABLE_HOST", "Could not resolve host.");
        }
    }

    private LinkPreviewDto fetchRemote(URI uri) {
        String host = uri.getHost().replaceFirst("^www\\.", "");
        try {
            HttpRequest req = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(4))
                .header("User-Agent", "Mozilla/5.0 (compatible; OrbitLinkPreview/1.0)")
                .header("Accept", "text/html,application/xhtml+xml")
                .GET()
                .build();
            HttpResponse<InputStream> res = http.send(req, HttpResponse.BodyHandlers.ofInputStream());
            if (res.statusCode() < 200 || res.statusCode() >= 400) {
                return fallback(uri.toString(), host);
            }
            return LinkPreviewHtmlParser.extract(uri, host, readBounded(res.body()));
        } catch (Exception ex) {
            return fallback(uri.toString(), host);
        }
    }

    private String readBounded(InputStream in) throws Exception {
        try (InputStream body = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[4096];
            int total = 0;
            int n;
            while ((n = body.read(buf)) != -1 && total < MAX_BODY_BYTES) {
                int take = Math.min(n, MAX_BODY_BYTES - total);
                out.write(buf, 0, take);
                total += take;
            }
            return out.toString(StandardCharsets.UTF_8);
        }
    }

    private LinkPreviewDto fallback(String url, String host) {
        return new LinkPreviewDto(url, host, host, null, null, host);
    }
}
