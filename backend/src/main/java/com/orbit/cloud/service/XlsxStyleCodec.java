package com.orbit.cloud.service;

import com.orbit.cloud.dto.SheetCellStyleDto;
import java.util.HashMap;
import java.util.Map;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.xssf.usermodel.XSSFCell;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

/** Applies and caches Apache POI XSSFCellStyle and XSSFFont objects per workbook. */
final class XlsxStyleCodec {

    private static final int MAX_STYLED_ROW = 10_000;
    private static final int MAX_STYLED_COL = 1_000;

    private record FontKey(
        Boolean bold, Boolean italic, Boolean underline, Boolean strike, Integer fontSize, String textColor
    ) {
        boolean isEmpty() {
            return bold == null && italic == null && underline == null
                && strike == null && fontSize == null && textColor == null;
        }
    }

    private final XSSFWorkbook workbook;
    private final DataFormat dataFormat;
    private final Map<SheetCellStyleDto, XSSFCellStyle> styleCache = new HashMap<>();
    private final Map<FontKey, XSSFFont> fontCache = new HashMap<>();

    XlsxStyleCodec(XSSFWorkbook workbook) {
        this.workbook = workbook;
        this.dataFormat = workbook.createDataFormat();
    }

    void applyStyle(XSSFCell cell, SheetCellStyleDto raw) {
        SheetCellStyleDto normalized = XlsxStyleHelper.normalize(raw);
        if (normalized == null) return;
        XSSFCellStyle style = styleCache.computeIfAbsent(normalized, this::createPoiStyle);
        cell.setCellStyle(style);
    }

    void applyExtraCellStyles(XSSFSheet sheet, Map<String, SheetCellStyleDto> styles) {
        for (Map.Entry<String, SheetCellStyleDto> entry : styles.entrySet()) {
            if (entry.getKey() == null) continue;
            SheetCellStyleDto normalized = XlsxStyleHelper.normalize(entry.getValue());
            if (normalized == null) continue;
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
                cell.setCellStyle(styleCache.computeIfAbsent(normalized, this::createPoiStyle));
            } catch (NumberFormatException ignored) {}
        }
    }

    static SheetCellStyleDto readStyle(XSSFCell cell) {
        return XlsxStyleReader.readStyle(cell);
    }

    private XSSFCellStyle createPoiStyle(SheetCellStyleDto dto) {
        XSSFCellStyle style = workbook.createCellStyle();
        FontKey fontKey = new FontKey(
            dto.bold(), dto.italic(), dto.underline(), dto.strike(), dto.fontSize(), dto.textColor()
        );
        if (!fontKey.isEmpty()) {
            style.setFont(fontCache.computeIfAbsent(fontKey, this::createPoiFont));
        }
        if (dto.bgColor() != null) {
            style.setFillForegroundColor(new XSSFColor(XlsxStyleHelper.hexToRgbBytes(dto.bgColor()), null));
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        }
        applyBorders(style, dto.border());
        applyAlignments(style, dto.align(), dto.valign());
        if (Boolean.TRUE.equals(dto.wrap())) {
            style.setWrapText(true);
        }
        String excelFmt = XlsxNumFmtHelper.toExcelNumFmt(dto.numFmt(), dto.decimals());
        if (excelFmt != null) {
            style.setDataFormat(dataFormat.getFormat(excelFmt));
        }
        return style;
    }

    private XSSFFont createPoiFont(FontKey key) {
        XSSFFont font = workbook.createFont();
        if (Boolean.TRUE.equals(key.bold())) font.setBold(true);
        if (Boolean.TRUE.equals(key.italic())) font.setItalic(true);
        if (Boolean.TRUE.equals(key.underline())) font.setUnderline(Font.U_SINGLE);
        if (Boolean.TRUE.equals(key.strike())) font.setStrikeout(true);
        if (key.fontSize() != null) {
            font.setFontHeightInPoints(key.fontSize().shortValue());
        } else if (font.getCTFont().sizeOfSzArray() > 0) {
            font.getCTFont().removeSz(0);
        }
        if (key.textColor() != null) {
            font.setColor(new XSSFColor(XlsxStyleHelper.hexToRgbBytes(key.textColor()), null));
        }
        return font;
    }

    private static void applyBorders(XSSFCellStyle style, String border) {
        if ("all".equals(border)) {
            style.setBorderTop(BorderStyle.THIN);
            style.setBorderRight(BorderStyle.THIN);
            style.setBorderBottom(BorderStyle.THIN);
            style.setBorderLeft(BorderStyle.THIN);
        } else if ("bottom".equals(border)) {
            style.setBorderBottom(BorderStyle.THIN);
        }
    }

    private static void applyAlignments(XSSFCellStyle style, String align, String valign) {
        if (align != null) {
            switch (align) {
                case "left" -> style.setAlignment(HorizontalAlignment.LEFT);
                case "center" -> style.setAlignment(HorizontalAlignment.CENTER);
                case "right" -> style.setAlignment(HorizontalAlignment.RIGHT);
                default -> {}
            }
        }
        if (valign != null) {
            switch (valign) {
                case "top" -> style.setVerticalAlignment(VerticalAlignment.TOP);
                case "middle" -> style.setVerticalAlignment(VerticalAlignment.CENTER);
                case "bottom" -> style.setVerticalAlignment(VerticalAlignment.BOTTOM);
                default -> {}
            }
        }
    }
}
