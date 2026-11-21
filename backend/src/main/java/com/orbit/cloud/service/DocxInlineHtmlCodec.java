package com.orbit.cloud.service;

import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.poi.xwpf.usermodel.UnderlinePatterns;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;

/** Converts sanitized inline HTML formatting tags to and from styled Apache POI XWPFRun segments. */
final class DocxInlineHtmlCodec {

    private static final Pattern STRIP_BLOCK_TAG =
        Pattern.compile("<(script|style)\\b[^>]*>[\\s\\S]*?</\\1>", Pattern.CASE_INSENSITIVE);
    private static final Pattern TAG_PATTERN =
        Pattern.compile("<(/?)([a-zA-Z][a-zA-Z0-9]*)(?:\\s[^<>]*)?(/?)>");

    private DocxInlineHtmlCodec() {}

    static void writeParagraphRuns(XWPFParagraph para, String rawHtml, String blockType) {
        String source = STRIP_BLOCK_TAG.matcher(rawHtml != null ? rawHtml : "").replaceAll("");
        if (source.isEmpty()) {
            applyBaseBlockStyle(para, para.createRun(), blockType);
            return;
        }
        int bold = 0, italic = 0, underline = 0, strike = 0, code = 0, lastIdx = 0;
        boolean wroteRun = false;
        Matcher m = TAG_PATTERN.matcher(source);
        while (m.find()) {
            if (m.start() > lastIdx) {
                String seg = decodeEntities(source.substring(lastIdx, m.start()));
                if (!seg.isEmpty()) {
                    emitTextRun(para, seg, blockType, new RunFlags(bold > 0, italic > 0, underline > 0, strike > 0, code > 0));
                    wroteRun = true;
                }
            }
            boolean closing = "/".equals(m.group(1));
            int delta = closing ? -1 : 1;
            switch (m.group(2).toLowerCase(Locale.ROOT)) {
                case "b", "strong" -> bold = Math.max(0, bold + delta);
                case "i", "em" -> italic = Math.max(0, italic + delta);
                case "u" -> underline = Math.max(0, underline + delta);
                case "s", "del", "strike" -> strike = Math.max(0, strike + delta);
                case "code" -> code = Math.max(0, code + delta);
                case "br" -> {
                    if (!closing) {
                        XWPFRun brRun = para.createRun();
                        applyBaseBlockStyle(para, brRun, blockType);
                        brRun.addBreak();
                        wroteRun = true;
                    }
                }
                default -> {}
            }
            lastIdx = m.end();
        }
        if (lastIdx < source.length()) {
            String tail = decodeEntities(source.substring(lastIdx));
            if (!tail.isEmpty()) {
                emitTextRun(para, tail, blockType, new RunFlags(bold > 0, italic > 0, underline > 0, strike > 0, code > 0));
                wroteRun = true;
            }
        }
        if (!wroteRun) applyBaseBlockStyle(para, para.createRun(), blockType);
    }

    static String readParagraphHtml(XWPFParagraph para, String blockType) {
        List<XWPFRun> runs = para.getRuns();
        if (runs == null || runs.isEmpty()) return escapeHtml(para.getText() != null ? para.getText() : "");
        boolean baseBold = blockType.equals("h1") || blockType.equals("h2") || blockType.equals("h3");
        boolean baseItalic = blockType.equals("quote");
        boolean baseCode = blockType.equals("code");
        StringBuilder out = new StringBuilder();
        RunFlags currentFlags = null;
        StringBuilder currentBuf = new StringBuilder();
        for (XWPFRun run : runs) {
            String text = run.text();
            if (text == null || text.isEmpty()) continue;
            RunFlags flags = extractFlags(run, baseBold, baseItalic, baseCode);
            if (currentFlags != null && !currentFlags.equals(flags)) {
                appendStyledSegment(out, currentBuf.toString(), currentFlags, baseCode);
                currentBuf.setLength(0);
            }
            currentFlags = flags;
            currentBuf.append(text);
        }
        if (currentFlags != null && currentBuf.length() > 0) {
            appendStyledSegment(out, currentBuf.toString(), currentFlags, baseCode);
        }
        return out.toString();
    }

    static void writeCellHtml(XWPFTableCell cell, String rawHtml) {
        XWPFParagraph para = cell.getParagraphs().isEmpty() ? cell.addParagraph() : cell.getParagraphs().get(0);
        while (!para.getRuns().isEmpty()) para.removeRun(0);
        writeParagraphRuns(para, rawHtml, "p");
    }

    static String readCellHtml(XWPFTableCell cell) {
        List<XWPFParagraph> paragraphs = cell.getParagraphs();
        if (paragraphs == null || paragraphs.isEmpty()) return escapeHtml(cell.getText() != null ? cell.getText() : "");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < paragraphs.size(); i++) {
            if (i > 0) sb.append("<br>");
            sb.append(readParagraphHtml(paragraphs.get(i), "p"));
        }
        return sb.toString();
    }

    private static void emitTextRun(XWPFParagraph para, String text, String blockType, RunFlags f) {
        XWPFRun run = para.createRun();
        applyBaseBlockStyle(para, run, blockType);
        if (f.bold) run.setBold(true);
        if (f.italic) run.setItalic(true);
        if (f.underline) run.setUnderline(UnderlinePatterns.SINGLE);
        if (f.strike) run.setStrikeThrough(true);
        if (f.code) run.setFontFamily("Courier New");
        run.setText(text);
    }

    private static void applyBaseBlockStyle(XWPFParagraph para, XWPFRun run, String type) {
        switch (type) {
            case "h1" -> { run.setBold(true); run.setFontSize(22); }
            case "h2" -> { run.setBold(true); run.setFontSize(18); }
            case "h3" -> { run.setBold(true); run.setFontSize(14); }
            case "quote" -> { run.setItalic(true); para.setIndentationLeft(360); }
            case "code" -> { run.setFontFamily("Courier New"); run.setFontSize(10); }
            default -> {}
        }
    }

    private static RunFlags extractFlags(XWPFRun run, boolean baseBold, boolean baseItalic, boolean baseCode) {
        boolean bold = !baseBold && run.isBold();
        boolean italic = !baseItalic && run.isItalic();
        boolean underline = run.getUnderline() != null && run.getUnderline() != UnderlinePatterns.NONE;
        boolean strike = run.isStrikeThrough() || run.isDoubleStrikeThrough();
        String font = run.getFontFamily() != null ? run.getFontFamily().toLowerCase(Locale.ROOT) : "";
        boolean code = !baseCode && (font.contains("courier") || font.contains("mono"));
        return new RunFlags(bold, italic, underline, strike, code);
    }

    private static void appendStyledSegment(StringBuilder out, String raw, RunFlags f, boolean preserveNewlines) {
        String escaped = escapeHtml(raw);
        if (!preserveNewlines) escaped = escaped.replace("\r\n", "<br>").replace("\n", "<br>");
        if (f.bold) out.append("<b>");
        if (f.italic) out.append("<i>");
        if (f.underline) out.append("<u>");
        if (f.strike) out.append("<s>");
        if (f.code) out.append("<code>");
        out.append(escaped);
        if (f.code) out.append("</code>");
        if (f.strike) out.append("</s>");
        if (f.underline) out.append("</u>");
        if (f.italic) out.append("</i>");
        if (f.bold) out.append("</b>");
    }

    private static String escapeHtml(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private static String decodeEntities(String s) {
        return s.replace("&nbsp;", " ").replace("\u00a0", " ")
            .replace("&lt;", "<").replace("&gt;", ">")
            .replace("&quot;", "\"").replace("&#39;", "'").replace("&amp;", "&");
    }

    private record RunFlags(boolean bold, boolean italic, boolean underline, boolean strike, boolean code) {}
}
