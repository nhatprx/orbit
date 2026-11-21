package com.orbit.cloud.service;

import java.util.regex.Pattern;

/** Converts between Orbit numFmt/decimals fields and Excel data format strings. */
final class XlsxNumFmtHelper {

    static final int MIN_DECIMALS = 0;
    static final int MAX_DECIMALS = 6;
    private static final Pattern DATE_TOKENS = Pattern.compile("[ymdhsYMDHS]|AM/PM|A/P");

    record ParsedNumFmt(String numFmt, Integer decimals) {}

    private XlsxNumFmtHelper() {}

    static Integer clampDecimals(Integer raw) {
        if (raw == null) return null;
        return Math.max(MIN_DECIMALS, Math.min(MAX_DECIMALS, raw));
    }

    static Integer resolveNormalizedDecimals(String numFmt, Integer rawDecimals) {
        if ("text".equals(numFmt)) return null;
        if (rawDecimals != null) return clampDecimals(rawDecimals);
        return numFmt == null ? null : defaultDecimals(numFmt);
    }

    static String toExcelNumFmt(String numFmt, Integer decimals) {
        if (numFmt == null) return null;
        if ("text".equals(numFmt)) return "@";
        int d = decimals != null ? decimals : defaultDecimals(numFmt);
        String frac = d > 0 ? "." + "0".repeat(d) : "";
        return switch (numFmt) {
            case "currency" -> "$#,##0" + frac;
            case "percent" -> "0" + frac + "%";
            case "number" -> "#,##0" + frac;
            default -> null;
        };
    }

    static ParsedNumFmt parseExcelNumFmt(String raw) {
        if (raw == null || raw.isBlank() || raw.equalsIgnoreCase("General")) {
            return new ParsedNumFmt(null, null);
        }
        String trimmed = raw.trim();
        if (trimmed.equals("@")) return new ParsedNumFmt("text", null);
        String section = trimmed.split(";", 2)[0];
        boolean isPercent = section.contains("%");
        boolean isCurrency = !isPercent && hasCurrencySymbol(section);
        String cleaned = stripLiteralsAndBrackets(section);
        if (isPercent) return new ParsedNumFmt("percent", extractDecimals(cleaned));
        if (isCurrency) return new ParsedNumFmt("currency", extractDecimals(cleaned));
        if (DATE_TOKENS.matcher(cleaned).find()) return new ParsedNumFmt(null, null);
        if (cleaned.indexOf('0') >= 0 || cleaned.indexOf('#') >= 0) {
            return new ParsedNumFmt("number", extractDecimals(cleaned));
        }
        return new ParsedNumFmt(null, null);
    }

    private static int defaultDecimals(String numFmt) {
        return switch (numFmt) {
            case "percent" -> 1;
            case "currency", "number" -> 2;
            default -> 0;
        };
    }

    private static boolean hasCurrencySymbol(String section) {
        return section.contains("$") || section.contains("\u20ac")
            || section.contains("\u00a3") || section.contains("\u00a5") || section.contains("\u00a4");
    }

    private static String stripLiteralsAndBrackets(String pattern) {
        StringBuilder sb = new StringBuilder(pattern.length());
        boolean inQuote = false;
        boolean inBracket = false;
        for (int i = 0; i < pattern.length(); i++) {
            char ch = pattern.charAt(i);
            if (ch == '\\' && !inQuote && i + 1 < pattern.length()) { i++; continue; }
            if ((ch == '_' || ch == '*') && !inQuote && !inBracket && i + 1 < pattern.length()) { i++; continue; }
            if (ch == '"') { inQuote = !inQuote; continue; }
            if (inQuote) continue;
            if (ch == '[') { inBracket = true; continue; }
            if (ch == ']') { inBracket = false; continue; }
            if (!inBracket) sb.append(ch);
        }
        return sb.toString();
    }

    private static int extractDecimals(String cleaned) {
        int dot = cleaned.indexOf('.');
        if (dot < 0) return 0;
        int count = 0;
        for (int i = dot + 1; i < cleaned.length(); i++) {
            char ch = cleaned.charAt(i);
            if (ch == '0' || ch == '#' || ch == '?') count++;
            else break;
        }
        return Math.min(MAX_DECIMALS, count);
    }
}
