package com.orbit.cloud;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.orbit.cloud.dto.OfficeSheetContentDto;
import com.orbit.cloud.dto.SheetCellStyleDto;
import com.orbit.cloud.dto.SheetTabDto;
import com.orbit.cloud.service.XlsxOfficeCodec;
import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.xssf.usermodel.XSSFCell;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

class XlsxStyleCodecTest {

    private final XlsxOfficeCodec codec = new XlsxOfficeCodec();

    @Test
    void roundTripsAllStylePropertiesAndWritesRealPoiAttributes() throws Exception {
        SheetCellStyleDto full = new SheetCellStyleDto(
            true, true, true, true, null, 14,
            "#22c55e", "#161b22", "all", "center", "middle", true, "currency", 3
        );
        SheetCellStyleDto bottomPercent = new SheetCellStyleDto(
            null, null, null, null, null, 11,
            "#000000", "#052E16", "bottom", "right", "bottom", null, "percent", 0
        );
        SheetCellStyleDto topText = new SheetCellStyleDto(
            null, null, null, null, null, 10,
            null, null, "none", "left", "top", null, "text", 4
        );
        SheetCellStyleDto num4 = new SheetCellStyleDto(
            null, null, null, null, null, null,
            null, null, null, null, null, null, "number", 4
        );
        OfficeSheetContentDto input = new OfficeSheetContentDto(List.of(
            new SheetTabDto("Styled", List.of(
                List.of("1250.5", "0.75", "Plain"),
                List.of("00123", "42.1234", "")
            ), Map.of("0:0", full, "0:1", bottomPercent, "1:0", topText, "1:1", num4))
        ));

        byte[] bytes = codec.write(input);
        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            XSSFCellStyle s00 = wb.getSheetAt(0).getRow(0).getCell(0).getCellStyle();
            XSSFFont f00 = s00.getFont();
            assertTrue(f00.getBold());
            assertTrue(f00.getItalic());
            assertEquals(Font.U_SINGLE, f00.getUnderline());
            assertTrue(f00.getStrikeout());
            assertEquals(14, f00.getFontHeightInPoints());
            assertEquals("FF22C55E", f00.getXSSFColor().getARGBHex());
            assertEquals(FillPatternType.SOLID_FOREGROUND, s00.getFillPattern());
            assertEquals("FF161B22", s00.getFillForegroundXSSFColor().getARGBHex());
            assertEquals(BorderStyle.THIN, s00.getBorderTop());
            assertEquals(BorderStyle.THIN, s00.getBorderRight());
            assertEquals(BorderStyle.THIN, s00.getBorderBottom());
            assertEquals(BorderStyle.THIN, s00.getBorderLeft());
            assertEquals(HorizontalAlignment.CENTER, s00.getAlignment());
            assertEquals(VerticalAlignment.CENTER, s00.getVerticalAlignment());
            assertTrue(s00.getWrapText());
            assertEquals("$#,##0.000", s00.getDataFormatString());

            XSSFCell c01 = wb.getSheetAt(0).getRow(0).getCell(1);
            assertEquals(BorderStyle.NONE, c01.getCellStyle().getBorderTop());
            assertEquals(BorderStyle.THIN, c01.getCellStyle().getBorderBottom());
            assertEquals(VerticalAlignment.BOTTOM, c01.getCellStyle().getVerticalAlignment());
            assertEquals("0%", c01.getCellStyle().getDataFormatString());

            XSSFCell c10 = wb.getSheetAt(0).getRow(1).getCell(0);
            assertEquals(CellType.STRING, c10.getCellType());
            assertEquals("@", c10.getCellStyle().getDataFormatString());
        }

        OfficeSheetContentDto parsed = codec.read(bytes);
        Map<String, SheetCellStyleDto> out = parsed.sheets().get(0).cellStyles();
        assertEquals(
            new SheetCellStyleDto(true, true, true, true, null, 14,
                "#22C55E", "#161B22", "all", "center", "middle", true, "currency", 3),
            out.get("0:0")
        );
        assertEquals(
            new SheetCellStyleDto(null, null, null, null, true, 11,
                "#000000", "#052E16", "bottom", "right", "bottom", null, "percent", 0),
            out.get("0:1")
        );
        assertEquals(
            new SheetCellStyleDto(null, null, null, null, null, 10,
                null, null, null, "left", "top", null, "text", null),
            out.get("1:0")
        );
        assertEquals(
            new SheetCellStyleDto(null, null, null, null, null, null,
                null, null, null, null, null, null, "number", 4),
            out.get("1:1")
        );
        assertNull(out.get("0:2"));
        assertEquals("00123", parsed.sheets().get(0).rows().get(1).get(0));
    }

    @Test
    void cachesStylesAndFontsPerWorkbookAcrossLargeGrids() throws Exception {
        List<List<String>> rows = new ArrayList<>();
        Map<String, SheetCellStyleDto> styles = new LinkedHashMap<>();
        SheetCellStyleDto sA = new SheetCellStyleDto(
            true, null, null, null, true, 12, "#22C55E", null, "all", "center", "middle", true, "currency", null
        );
        SheetCellStyleDto sAEquivalent = new SheetCellStyleDto(
            true, false, false, false, null, 12, "#22c55e", "#052e16", "all", "center", "middle", true, "currency", 2
        );
        SheetCellStyleDto sB = new SheetCellStyleDto(
            null, true, null, null, null, null, null, "#161B22", "bottom", "right", null, null, "percent", 2
        );
        for (int r = 0; r < 150; r++) {
            rows.add(List.of("A" + r, "B" + r, "C" + r, "D" + r));
            styles.put(r + ":0", sA);
            styles.put(r + ":1", sAEquivalent);
            styles.put(r + ":2", sB);
        }
        byte[] bytes = codec.write(new OfficeSheetContentDto(List.of(new SheetTabDto("Cached", rows, styles))));
        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertEquals(3, wb.getNumCellStyles());
            assertEquals(3, wb.getNumberOfFonts());
        }
    }
}
