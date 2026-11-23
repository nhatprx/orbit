package com.orbit.chat.service;

import com.orbit.chat.dto.LinkPreviewDto;
import java.net.URI;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class LinkPreviewHtmlParser {

    private static final Pattern TITLE_RE = Pattern.compile("(?is)<title[^>]*>(.*?)</title>");
    private static final Pattern META_TAG_RE = Pattern.compile("(?is)<meta\\s+[^>]*>");
    private static final Pattern ATTR_RE = Pattern.compile("(?is)([a-zA-Z0-9:_-]+)\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s\"'>]+))");

    private LinkPreviewHtmlParser() {}

    static LinkPreviewDto extract(URI baseUri, String host, String html) {
        String ogTitle = null;
        String ogDesc = null;
        String metaDesc = null;
        String ogImage = null;
        String ogSite = null;

        Matcher metaMatcher = META_TAG_RE.matcher(html);
        while (metaMatcher.find()) {
            String key = null;
            String content = null;
            Matcher attr = ATTR_RE.matcher(metaMatcher.group());
            while (attr.find()) {
                String name = attr.group(1).toLowerCase(Locale.ROOT);
                String val = attr.group(2) != null ? attr.group(2)
                    : attr.group(3) != null ? attr.group(3) : attr.group(4);
                if ("property".equals(name) || "name".equals(name)) key = val.toLowerCase(Locale.ROOT);
                else if ("content".equals(name)) content = val;
            }
            if (key == null || content == null || content.isBlank()) continue;
            switch (key) {
                case "og:title", "twitter:title" -> { if (ogTitle == null) ogTitle = clean(content, 200); }
                case "og:description", "twitter:description" -> { if (ogDesc == null) ogDesc = clean(content, 300); }
                case "description" -> { if (metaDesc == null) metaDesc = clean(content, 300); }
                case "og:image", "twitter:image" -> { if (ogImage == null) ogImage = resolveImageUrl(baseUri, content); }
                case "og:site_name" -> { if (ogSite == null) ogSite = clean(content, 80); }
                default -> {}
            }
        }
        String title = ogTitle != null ? ogTitle : extractTitleTag(html);
        String desc = ogDesc != null ? ogDesc : metaDesc;
        return new LinkPreviewDto(
            baseUri.toString(),
            host,
            title != null && !title.isBlank() ? title : host,
            desc,
            ogImage,
            ogSite != null ? ogSite : host
        );
    }

    private static String extractTitleTag(String html) {
        Matcher m = TITLE_RE.matcher(html);
        return m.find() ? clean(m.group(1), 200) : null;
    }

    private static String resolveImageUrl(URI baseUri, String raw) {
        try {
            URI resolved = baseUri.resolve(raw.trim());
            String scheme = resolved.getScheme() == null ? "" : resolved.getScheme().toLowerCase(Locale.ROOT);
            return ("http".equals(scheme) || "https".equals(scheme)) ? resolved.toString() : null;
        } catch (Exception ex) {
            return null;
        }
    }

    private static String clean(String raw, int max) {
        String text = raw
            .replace("&amp;", "&")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replaceAll("\\s+", " ")
            .trim();
        return text.length() > max ? text.substring(0, max - 1) + "..." : text;
    }
}
