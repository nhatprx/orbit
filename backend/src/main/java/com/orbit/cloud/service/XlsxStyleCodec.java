package com.orbit.cloud.service;

import com.orbit.cloud.dto.SheetCellStyleDto;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.xssf.usermodel.XSSFCell;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

/** Maps SheetCellStyleDto records to and from cached Apache POI XSSFCellStyle/Font/DataFormat objects. */
final class XlsxStyleCodec {

    private static final String FMT_CURRENCY = "$#,##0.00";
    private static final String FMT_PERCENT = "0.0%";
    private static final String FMT_NUMBER = "#,##0.00";
    private static final int MAX_STYLED_ROW = 10_000;
    private static final int MAX_STYLED_COL = 1_000;

    private final XSSFWorkbook workbook;
    private final DataFormat dataFormat;
    private final Map<SheetCellStyleDto, XSSFCellStyle> styleCache = new HashMap<>();

    XlsxStyleCodec(XSSFWorkbook workbook) {
        this.workbook = workbook;
        this.dataFormat = workbook.createDataFormat();
    }

    void applyStyle(XSSFCell cell, SheetCellStyleDto raw) {
        SheetCellStyleDto normalized = normalize(raw);
        if (normalized == null || normalized.isEmpty()) return;
        XSSFCellStyle style = styleCache.computeIfAbsent(normalized, this::createPoiStyle);
        cell.setCellStyle(style);
    }

    void applyExtraCellStyles(XSSFSheet sheet, Map<String, SheetCellStyleDto> styles) {
        for (Map.Entry<String, SheetCellStyleDto> entry : styles.entrySet()) {
            if (entry.getKey() == null || entry.getValue() == null || entry.getValue().isEmpty()) continue;
            String[] parts = entry.getKey().split(":");
            if (parts.length != 2) continue;
            try {
                int r = Integer.parseInt(parts[0]);
                int c = Integer.parseInt(parts[1]);
                if (r < 0 || c < 0 || r >= MAX_STYLED_ROW || c >= MAX_STYLED_COL) continue;
                XSSFRow row = sheet.getRow(r);
                if (row == null) row = sheet.createRow(r);
                XSSFCell cell = row.getCell(c);
                if (cell == null) cell = row.createCell(c);
                applyStyle(cell, entry.getValue());
            } catch (NumberFormatException ignored) {}
        }
    }

    static SheetCellStyleDto readStyle(XSSFCell cell) {
        if (cell == null) return null;
        XSSFCellStyle style = cell.getCellStyle();
        if (style == null) return null;
        XSSFFont font = style.getFont();
        Boolean bold = font != null && font.getBold() ? Boolean.TRUE : null;
        Boolean italic = font != null && font.getItalic() ? Boolean.TRUE : null;
        Boolean underline = font != null && font.getUnderline() != Font.U_NONE ? Boolean.TRUE : null;
        Boolean highlight = isHighlighted(style) ? Boolean.TRUE : null;
        String align = readAlign(style.getAlignment());
        String numFmt = readNumFmt(style.getDataFormatString());
        SheetCellStyleDto dto = new SheetCellStyleDto(bold, italic, underline, highlight, align, numFmt);
        return dto.isEmpty() ? null : dto;
    }

    private XSSFCellStyle createPoiStyle(SheetCellStyleDto dto) {
        XSSFCellStyle style = workbook.createCellStyle();
        if (Boolean.TRUE.equals(dto.bold()) || Boolean.TRUE.equals(dto.italic()) || Boolean.TRUE.equals(dto.underline())) {
            XSSFFont font = workbook.createFont();
            if (Boolean.TRUE.equals(dto.bold())) font.setBold(true);
            if (Boolean.TRUE.equals(dto.italic())) font.setItalic(true);
            if (Boolean.TRUE.equals(dto.underline())) font.setUnderline(Font.U_SINGLE);
            style.setFont(font);
        }
        if (Boolean.TRUE.equals(dto.highlight())) {
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            style.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
        }
        if (dto.align() != null) {
            switch (dto.align()) {
                case "left" -> style.setAlignment(HorizontalAlignment.LEFT);
                case "center" -> style.setAlignment(HorizontalAlignment.CENTER);
                case "right" -> style.setAlignment(HorizontalAlignment.RIGHT);
                default -> {}
            }
        }
        if (dto.numFmt() != null) {
            String excelFmt = switch (dto.numFmt()) {
                case "currency" -> FMT_CURRENCY;
                case "percent" -> FMT_PERCENT;
                case "number" -> FMT_NUMBER;
                default -> null;
            };
            if (excelFmt != null) style.setDataFormat(dataFormat.getFormat(excelFmt));
        }
        return style;
    }

    private static SheetCellStyleDto normalize(SheetCellStyleDto dto) {
        if (dto == null) return null;
        Boolean bold = Boolean.TRUE.equals(dto.bold()) ? Boolean.TRUE : null;
        Boolean italic = Boolean.TRUE.equals(dto.italic()) ? Boolean.TRUE : null;
        Boolean underline = Boolean.TRUE.equals(dto.underline()) ? Boolean.TRUE : null;
        Boolean highlight = Boolean.TRUE.equals(dto.highlight()) ? Boolean.TRUE : null;
        SheetCellStyleDto clean = new SheetCellStyleDto(
            bold, italic, underline, highlight, normalizeAlign(dto.align()), normalizeNumFmt(dto.numFmt())
        );
        return clean.isEmpty() ? null : clean;
    }

    private static String normalizeAlign(String raw) {
        if (raw == null || raw.isBlank()) return null;
        return switch (raw.trim().toLowerCase(Locale.ROOT)) {
            case "left", "center", "right" -> raw.trim().toLowerCase(Locale.ROOT);
            default -> null;
        };
    }

    private static String normalizeNumFmt(String raw) {
        if (raw == null || raw.isBlank()) return null;
        return switch (raw.trim().toLowerCase(Locale.ROOT)) {
            case "currency" -> "currency";
            case "percent" -> "percent";
            case "number", "decimal" -> "number";
            default -> null;
        };
    }

    private static String readAlign(HorizontalAlignment align) {
        if (align == null) return null;
        return switch (align) {
            case LEFT -> "left";
            case CENTER -> "center";
            case RIGHT -> "right";
            default -> null;
        };
    }

    private static String readNumFmt(String fmt) {
        if (fmt == null || fmt.isBlank() || fmt.equalsIgnoreCase("General") || fmt.equals("@")) return null;
        if (fmt.contains("%")) return "percent";
        if (fmt.contains("$") || fmt.contains("\u20ac") || fmt.contains("\u00a3") || fmt.contains("\u00a4")) return "currency";
        if (fmt.equals(FMT_NUMBER) || fmt.equals("0.00") || fmt.equals("#,##0")) return "number";
        return null;
    }

    private static boolean isHighlighted(XSSFCellStyle style) {
        if (style.getFillPattern() != FillPatternType.SOLID_FOREGROUND) return false;
        short idx = style.getFillForegroundColor();
        if (idx != IndexedColors.AUTOMATIC.getIndex() && idx != IndexedColors.WHITE.getIndex() && idx != 0) return true;
        XSSFColor color = style.getFillForegroundXSSFColor();
        return color != null && !color.isAuto();
    }
}
