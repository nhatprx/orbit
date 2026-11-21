package com.orbit.cloud.service;

import com.orbit.cloud.dto.OfficeSheetContentDto;
import com.orbit.cloud.dto.SheetCellStyleDto;
import com.orbit.cloud.dto.SheetTabDto;
import com.orbit.common.ApiException;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.util.WorkbookUtil;
import org.apache.poi.xssf.usermodel.XSSFCell;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

/** Apache POI codec converting .xlsx workbooks to and from structured Orbit Native Office Sheets with styles. */
@Component
public class XlsxOfficeCodec {

    private static final Pattern CANONICAL_NUMBER = Pattern.compile("^-?(?:0|[1-9]\\d*)(?:\\.\\d*[1-9])?$");

    public OfficeSheetContentDto read(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return new OfficeSheetContentDto(List.of(new SheetTabDto("Sheet1", List.of(), Map.of())));
        }
        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            DataFormatter formatter = new DataFormatter(Locale.US);
            List<SheetTabDto> sheets = new ArrayList<>();
            int sheetCount = wb.getNumberOfSheets();
            for (int i = 0; i < sheetCount; i++) {
                XSSFSheet sheet = wb.getSheetAt(i);
                Map<String, SheetCellStyleDto> cellStyles = new LinkedHashMap<>();
                List<List<String>> rows = readSheetRows(sheet, formatter, cellStyles);
                sheets.add(new SheetTabDto(sheet.getSheetName(), rows, cellStyles));
            }
            if (sheets.isEmpty()) {
                sheets.add(new SheetTabDto("Sheet1", List.of(), Map.of()));
            }
            return new OfficeSheetContentDto(sheets);
        } catch (IOException | RuntimeException ex) {
            throw ApiException.badRequest("INVALID_XLSX", "Unable to parse XLSX workbook.");
        }
    }

    public byte[] write(OfficeSheetContentDto content) {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XlsxStyleCodec styleCodec = new XlsxStyleCodec(wb);
            List<SheetTabDto> tabs = content != null && content.sheets() != null && !content.sheets().isEmpty()
                ? content.sheets()
                : List.of(new SheetTabDto("Sheet1", List.of(), Map.of()));
            for (int i = 0; i < tabs.size(); i++) {
                SheetTabDto tab = tabs.get(i);
                String sheetName = uniqueSheetName(wb, tab != null ? tab.name() : null, i + 1);
                XSSFSheet sheet = wb.createSheet(sheetName);
                Map<String, SheetCellStyleDto> styles = tab != null && tab.cellStyles() != null ? tab.cellStyles() : Map.of();
                List<List<String>> rows = tab != null && tab.rows() != null ? tab.rows() : List.of();
                for (int r = 0; r < rows.size(); r++) {
                    List<String> rowCells = rows.get(r);
                    XSSFRow row = sheet.createRow(r);
                    if (rowCells == null) continue;
                    for (int c = 0; c < rowCells.size(); c++) {
                        XSSFCell cell = row.createCell(c);
                        SheetCellStyleDto cellStyle = styles.get(r + ":" + c);
                        writeCell(cell, rowCells.get(c), cellStyle);
                        styleCodec.applyStyle(cell, cellStyle);
                    }
                }
                styleCodec.applyExtraCellStyles(sheet, styles);
            }
            wb.write(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw ApiException.badRequest("XLSX_WRITE_FAILED", "Failed to serialize XLSX workbook.");
        }
    }

    private static List<List<String>> readSheetRows(
        XSSFSheet sheet, DataFormatter formatter, Map<String, SheetCellStyleDto> cellStyles
    ) {
        if (sheet.getPhysicalNumberOfRows() == 0 && sheet.getRow(0) == null) return List.of();
        int lastRow = sheet.getLastRowNum();
        List<List<String>> rows = new ArrayList<>(lastRow + 1);
        for (int r = 0; r <= lastRow; r++) {
            XSSFRow row = sheet.getRow(r);
            if (row == null || row.getLastCellNum() <= 0) {
                rows.add(List.of());
                continue;
            }
            int lastCol = row.getLastCellNum();
            List<String> cells = new ArrayList<>(lastCol);
            for (int c = 0; c < lastCol; c++) {
                XSSFCell cell = row.getCell(c);
                cells.add(readCellValue(cell, formatter));
                SheetCellStyleDto style = XlsxStyleCodec.readStyle(cell);
                if (style != null) cellStyles.put(r + ":" + c, style);
            }
            rows.add(cells);
        }
        return rows;
    }

    private static String readCellValue(XSSFCell cell, DataFormatter formatter) {
        if (cell == null || cell.getCellType() == CellType.BLANK) return "";
        return switch (cell.getCellType()) {
            case FORMULA -> "=" + cell.getCellFormula();
            case STRING -> cell.getStringCellValue() != null ? cell.getStringCellValue() : "";
            case BOOLEAN -> Boolean.toString(cell.getBooleanCellValue());
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) yield formatter.formatCellValue(cell);
                double d = cell.getNumericCellValue();
                if (d == Math.floor(d) && !Double.isInfinite(d) && Math.abs(d) < 9_007_199_254_740_991D) {
                    yield Long.toString((long) d);
                }
                yield Double.toString(d);
            }
            default -> formatter.formatCellValue(cell);
        };
    }

    private static void writeCell(XSSFCell cell, String raw, SheetCellStyleDto style) {
        if (raw == null || raw.isEmpty()) {
            cell.setBlank();
            return;
        }
        if (style != null && "text".equalsIgnoreCase(style.numFmt() != null ? style.numFmt().trim() : "")) {
            cell.setCellValue(raw);
            return;
        }
        if (raw.startsWith("=") && raw.length() > 1) {
            try { cell.setCellFormula(raw.substring(1)); } catch (RuntimeException ex) { cell.setCellValue(raw); }
            return;
        }
        if (CANONICAL_NUMBER.matcher(raw).matches()) {
            try {
                double parsed = Double.parseDouble(raw);
                if (Double.isFinite(parsed) && Math.abs(parsed) < 9_007_199_254_740_991D) {
                    cell.setCellValue(parsed);
                    return;
                }
            } catch (NumberFormatException ignored) {}
        }
        cell.setCellValue(raw);
    }

    private static String uniqueSheetName(XSSFWorkbook wb, String requested, int fallbackIndex) {
        String raw = (requested == null || requested.isBlank()) ? "Sheet" + fallbackIndex : requested.trim();
        String base = WorkbookUtil.createSafeSheetName(raw);
        if (base.isBlank()) base = "Sheet" + fallbackIndex;
        String candidate = base;
        int suffix = 2;
        while (wb.getSheet(candidate) != null) {
            String tag = "_" + suffix++;
            int maxBase = Math.max(1, 31 - tag.length());
            candidate = (base.length() > maxBase ? base.substring(0, maxBase) : base) + tag;
        }
        return candidate;
    }
}
