package com.orbit.issues.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Pure utility that derives a 2-6 uppercase letter issue key prefix from a project slug or name. */
public final class IssueKeyGenerator {

    public static final String DEFAULT_PREFIX = "ORB";
    public static final int MIN_PREFIX_LENGTH = 2;
    public static final int MAX_PREFIX_LENGTH = 6;

    private IssueKeyGenerator() {}

    public static String derivePrefix(String projectSlug, String projectName) {
        String fromSlug = extractPrefix(projectSlug);
        if (fromSlug != null) {
            return fromSlug;
        }
        String fromName = extractPrefix(projectName);
        if (fromName != null) {
            return fromName;
        }
        return DEFAULT_PREFIX;
    }

    public static String formatKey(String projectSlug, String projectName, int issueNumber) {
        if (issueNumber < 1) {
            throw new IllegalArgumentException("Issue number must be positive.");
        }
        return derivePrefix(projectSlug, projectName) + "-" + issueNumber;
    }

    private static String extractPrefix(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        List<String> tokens = alphabeticTokens(raw);
        if (tokens.isEmpty()) {
            return null;
        }
        if (tokens.size() >= MIN_PREFIX_LENGTH) {
            StringBuilder initials = new StringBuilder();
            int limit = Math.min(tokens.size(), MAX_PREFIX_LENGTH);
            for (int i = 0; i < limit; i++) {
                initials.append(tokens.get(i).charAt(0));
            }
            return initials.toString().toUpperCase(Locale.ROOT);
        }
        String single = tokens.get(0).toUpperCase(Locale.ROOT);
        if (single.length() < MIN_PREFIX_LENGTH) {
            return null;
        }
        return single.length() > MAX_PREFIX_LENGTH ? single.substring(0, MAX_PREFIX_LENGTH) : single;
    }

    private static List<String> alphabeticTokens(String raw) {
        List<String> tokens = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (int i = 0; i < raw.length(); i++) {
            char ch = raw.charAt(i);
            if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z')) {
                current.append(ch);
            } else if (!current.isEmpty()) {
                tokens.add(current.toString());
                current.setLength(0);
            }
        }
        if (!current.isEmpty()) {
            tokens.add(current.toString());
        }
        return tokens;
    }
}
