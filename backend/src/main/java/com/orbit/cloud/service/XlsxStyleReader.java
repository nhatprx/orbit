package com.orbit.cloud.service;

import com.orbit.cloud.dto.SheetCellStyleDto;
import com.orbit.cloud.service.XlsxNumFmtHelper.ParsedNumFmt;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.xssf.usermodel.XSSFCell;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.openxmlformats.schemas.spreadsheetml.x2006.main.CTXf;

/** Extracts SheetCellStyleDto records from Apache POI XSSFCell styles. */
final class XlsxStyleReader {

    private XlsxStyleReader() {}

    static SheetCellStyleDto readStyle(XSSFCell cell) {
        if (cell == null) return null;
        XSSFCellStyle style = cell.getCellStyle();
        if (style == null || style.getIndex() == 0) return null;

        XSSFFont font = style.getFont();
        Boolean bold = font != null && font.getBold() ? Boolean.TRUE : null;
        Boolean italic = font != null && font.getItalic() ? Boolean.TRUE : null;
        Boolean underline = font != null && font.getUnderline() != Font.U_NONE ? Boolean.TRUE : null;
        Boolean strike = font != null && font.getStrikeout() ? Boolean.TRUE : null;
        Integer fontSize = readFontSize(style, font);
        String textColor = font != null ? XlsxStyleHelper.readColorHex(font.getXSSFColor(), false) : null;

        String bgColor = readBgColor(style);
        Boolean highlight = XlsxStyleHelper.HIGHLIGHT_BG_HEX.equals(bgColor) ? Boolean.TRUE : null;
        String border = readBorder(style);
        String align = readAlign(style.getAlignment());
        String valign = readValign(style);
        Boolean wrap = style.getWrapText() ? Boolean.TRUE : null;
        ParsedNumFmt fmt = XlsxNumFmtHelper.parseExcelNumFmt(style.getDataFormatString());

        SheetCellStyleDto dto = new SheetCellStyleDto(
            bold, italic, underline, strike, highlight, fontSize,
            textColor, bgColor, border, align, valign, wrap, fmt.numFmt(), fmt.decimals()
        );
        return dto.isEmpty() ? null : dto;
    }

    private static Integer readFontSize(XSSFCellStyle style, XSSFFont font) {
        if (font == null || style.getFontIndex() == 0) return null;
        if (font.getCTFont() == null || font.getCTFont().sizeOfSzArray() == 0) return null;
        return XlsxStyleHelper.clampFontSize((int) font.getFontHeightInPoints());
    }

    private static String readBgColor(XSSFCellStyle style) {
        if (style.getFillPattern() != FillPatternType.SOLID_FOREGROUND) return null;
        String hex = XlsxStyleHelper.readColorHex(style.getFillForegroundXSSFColor(), true);
        if (hex != null) return hex;
        return XlsxStyleHelper.indexedToHex(style.getFillForegroundColor());
    }

    private static String readBorder(XSSFCellStyle style) {
        boolean top = hasBorder(style.getBorderTop());
        boolean right = hasBorder(style.getBorderRight());
        boolean bottom = hasBorder(style.getBorderBottom());
        boolean left = hasBorder(style.getBorderLeft());
        if (top && right && bottom && left) return "all";
        if (bottom) return "bottom";
        return null;
    }

    private static boolean hasBorder(BorderStyle border) {
        return border != null && border != BorderStyle.NONE;
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

    private static String readValign(XSSFCellStyle style) {
        CTXf xf = style.getCoreXf();
        if (xf == null || !xf.isSetAlignment() || !xf.getAlignment().isSetVertical()) return null;
        VerticalAlignment valign = style.getVerticalAlignment();
        if (valign == null) return null;
        return switch (valign) {
            case TOP -> "top";
            case CENTER -> "middle";
            case BOTTOM -> "bottom";
            default -> null;
        };
    }
}
