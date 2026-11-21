package com.orbit.cloud.service;

import com.orbit.cloud.dto.SheetCellStyleDto;
import java.util.Locale;
import java.util.regex.Pattern;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.xssf.usermodel.DefaultIndexedColorMap;
import org.apache.poi.xssf.usermodel.XSSFColor;

/** Normalization, bounds clamping, and RGB hex conversion helpers for SheetCellStyleDto. */
final class XlsxStyleHelper {

    static final String HIGHLIGHT_BG_HEX = "#052E16";
    static final int MIN_FONT_SIZE = 8;
    static final int MAX_FONT_SIZE = 36;
    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9A-Fa-f]{6}$");

    private XlsxStyleHelper() {}

    static SheetCellStyleDto normalize(SheetCellStyleDto dto) {
        if (dto == null) return null;
        Boolean bold = Boolean.TRUE.equals(dto.bold()) ? Boolean.TRUE : null;
        Boolean italic = Boolean.TRUE.equals(dto.italic()) ? Boolean.TRUE : null;
        Boolean underline = Boolean.TRUE.equals(dto.underline()) ? Boolean.TRUE : null;
        Boolean strike = Boolean.TRUE.equals(dto.strike()) ? Boolean.TRUE : null;
        Integer fontSize = clampFontSize(dto.fontSize());
        String textColor = normalizeHex(dto.textColor());
        String bgColor = normalizeHex(dto.bgColor());
        if (bgColor == null && Boolean.TRUE.equals(dto.highlight())) {
            bgColor = HIGHLIGHT_BG_HEX;
        }
        Boolean highlight = HIGHLIGHT_BG_HEX.equals(bgColor) ? Boolean.TRUE : null;
        String border = normalizeBorder(dto.border());
        String align = normalizeAlign(dto.align());
        String valign = normalizeValign(dto.valign());
        Boolean wrap = Boolean.TRUE.equals(dto.wrap()) ? Boolean.TRUE : null;
        String numFmt = normalizeNumFmt(dto.numFmt());
        Integer decimals = XlsxNumFmtHelper.resolveNormalizedDecimals(numFmt, dto.decimals());
        if (numFmt == null && decimals != null) {
            numFmt = "number";
        }
        SheetCellStyleDto clean = new SheetCellStyleDto(
            bold, italic, underline, strike, highlight, fontSize,
            textColor, bgColor, border, align, valign, wrap, numFmt, decimals
        );
        return clean.isEmpty() ? null : clean;
    }

    static Integer clampFontSize(Integer raw) {
        if (raw == null) return null;
        return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, raw));
    }

    static String normalizeHex(String raw) {
        if (raw == null) return null;
        String trimmed = raw.trim();
        if (!HEX_COLOR.matcher(trimmed).matches()) return null;
        return trimmed.toUpperCase(Locale.ROOT);
    }

    static byte[] hexToRgbBytes(String hex) {
        int val = Integer.parseInt(hex.substring(1), 16);
        return new byte[] { (byte) ((val >> 16) & 0xFF), (byte) ((val >> 8) & 0xFF), (byte) (val & 0xFF) };
    }

    static String readColorHex(XSSFColor color, boolean allowIndexed) {
        if (color == null || color.isAuto()) return null;
        if (color.getCTColor() != null && color.getCTColor().isSetRgb()) {
            byte[] rgb = color.getRGB();
            if (rgb != null && rgb.length >= 3) return formatRgb(rgb);
        }
        if (allowIndexed && color.isIndexed()) {
            return indexedToHex(color.getIndexed());
        }
        return null;
    }

    static String indexedToHex(short idx) {
        if (idx <= 0 || idx == IndexedColors.AUTOMATIC.getIndex() || idx == IndexedColors.WHITE.getIndex()) {
            return null;
        }
        byte[] rgb = DefaultIndexedColorMap.getDefaultRGB(idx);
        return rgb != null && rgb.length >= 3 ? formatRgb(rgb) : null;
    }

    private static String normalizeBorder(String raw) {
        if (raw == null || raw.isBlank()) return null;
        return switch (raw.trim().toLowerCase(Locale.ROOT)) {
            case "all" -> "all";
            case "bottom" -> "bottom";
            default -> null;
        };
    }

    private static String normalizeAlign(String raw) {
        if (raw == null || raw.isBlank()) return null;
        return switch (raw.trim().toLowerCase(Locale.ROOT)) {
            case "left", "center", "right" -> raw.trim().toLowerCase(Locale.ROOT);
            default -> null;
        };
    }

    private static String normalizeValign(String raw) {
        if (raw == null || raw.isBlank()) return null;
        return switch (raw.trim().toLowerCase(Locale.ROOT)) {
            case "top", "middle", "bottom" -> raw.trim().toLowerCase(Locale.ROOT);
            default -> null;
        };
    }

    private static String normalizeNumFmt(String raw) {
        if (raw == null || raw.isBlank()) return null;
        return switch (raw.trim().toLowerCase(Locale.ROOT)) {
            case "text" -> "text";
            case "currency" -> "currency";
            case "percent" -> "percent";
            case "number", "decimal" -> "number";
            default -> null;
        };
    }

    private static String formatRgb(byte[] rgb) {
        return String.format(Locale.ROOT, "#%02X%02X%02X", rgb[0] & 0xFF, rgb[1] & 0xFF, rgb[2] & 0xFF);
    }
}
