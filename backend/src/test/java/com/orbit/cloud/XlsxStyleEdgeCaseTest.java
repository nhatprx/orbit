package com.orbit.cloud;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.orbit.cloud.dto.OfficeSheetContentDto;
import com.orbit.cloud.dto.SheetCellStyleDto;
import com.orbit.cloud.dto.SheetTabDto;
import com.orbit.cloud.service.XlsxOfficeCodec;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.xssf.usermodel.XSSFCell;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

class XlsxStyleEdgeCaseTest {

    private final XlsxOfficeCodec codec = new XlsxOfficeCodec();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void sanitizesInvalidInputsClampsBoundsAndHandlesHighlightPrecedence() {
        Map<String, SheetCellStyleDto> styles = Map.of(
            "0:0", new SheetCellStyleDto(
                null, null, null, null, true, 4,
                "not-hex", "#fff", "diagonal", "justify", "baseline", null, "auto", -2
            ),
            "0:1", new SheetCellStyleDto(
                null, null, null, null, true, 99,
                "#12345G", "#1e293b", "all", "LEFT", "TOP", false, "number", 12
            ),
            "0:2", new SheetCellStyleDto(
                false, false, false, false, false, null,
                "red", "blue", "none", "bad", "bad", false, "auto", null
            ),
            "5:5", new SheetCellStyleDto(
                null, null, null, null, null, null,
                "invalid", "invalid", "none", null, null, null, "auto", null
            )
        );
        OfficeSheetContentDto input = new OfficeSheetContentDto(List.of(
            new SheetTabDto("Bounds", List.of(List.of("1", "2", "3")), styles)
        ));

        OfficeSheetContentDto parsed = codec.read(codec.write(input));
        SheetTabDto sheet = parsed.sheets().get(0);
        assertEquals(1, sheet.rows().size());
        assertEquals(
            new SheetCellStyleDto(null, null, null, null, true, 8,
                null, "#052E16", null, null, null, null, "number", 0),
            sheet.cellStyles().get("0:0")
        );
        assertEquals(
            new SheetCellStyleDto(null, null, null, null, null, 36,
                null, "#1E293B", "all", "left", "top", null, "number", 6),
            sheet.cellStyles().get("0:1")
        );
        assertNull(sheet.cellStyles().get("0:2"));
        assertNull(sheet.cellStyles().get("5:5"));
    }

    @Test
    void readsLegacyIndexedFillAndExternalExcelNumberFormatsSafely() throws Exception {
        byte[] externalBytes;
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XSSFSheet sheet = wb.createSheet("External");
            XSSFRow row = sheet.createRow(0);
            DataFormat df = wb.createDataFormat();

            XSSFCell legacyFillCell = row.createCell(0);
            legacyFillCell.setCellValue("Legacy");
            XSSFCellStyle fillStyle = wb.createCellStyle();
            fillStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            fillStyle.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
            legacyFillCell.setCellStyle(fillStyle);

            XSSFCell multiSecCurrency = row.createCell(1);
            multiSecCurrency.setCellValue(120.5);
            XSSFCellStyle currStyle = wb.createCellStyle();
            currStyle.setDataFormat(df.getFormat("$#,##0.00;($#,##0.00)"));
            multiSecCurrency.setCellStyle(currStyle);

            XSSFCell dateCell = row.createCell(2);
            dateCell.setCellValue(45000.0);
            XSSFCellStyle dateStyle = wb.createCellStyle();
            dateStyle.setDataFormat(df.getFormat("yyyy-mm-dd"));
            dateCell.setCellStyle(dateStyle);

            wb.write(out);
            externalBytes = out.toByteArray();
        }

        OfficeSheetContentDto parsed = codec.read(externalBytes);
        Map<String, SheetCellStyleDto> out = parsed.sheets().get(0).cellStyles();
        assertNotNull(out.get("0:0").bgColor());
        assertTrue(out.get("0:0").bgColor().matches("^#[0-9A-F]{6}$"));
        assertEquals("currency", out.get("0:1").numFmt());
        assertEquals(2, out.get("0:1").decimals());
        assertNull(out.get("0:2"));
    }

    @Test
    void serializesJsonWithoutNullsAndDeserializesPartialContractPayload() throws Exception {
        String json = objectMapper.writeValueAsString(
            new SheetCellStyleDto(
                true, null, null, true, null, 12,
                "#22C55E", null, "bottom", null, "top", true, "text", null
            )
        );
        assertFalse(json.contains("null"));
        assertTrue(json.contains("\"bold\":true"));
        assertTrue(json.contains("\"strike\":true"));
        assertTrue(json.contains("\"fontSize\":12"));
        assertTrue(json.contains("\"textColor\":\"#22C55E\""));
        assertTrue(json.contains("\"border\":\"bottom\""));
        assertTrue(json.contains("\"valign\":\"top\""));
        assertTrue(json.contains("\"wrap\":true"));
        assertTrue(json.contains("\"numFmt\":\"text\""));

        SheetCellStyleDto fromPartial = objectMapper.readValue(
            "{\"bold\":true,\"bgColor\":\"#052E16\",\"decimals\":3}", SheetCellStyleDto.class
        );
        assertEquals(Boolean.TRUE, fromPartial.bold());
        assertEquals("#052E16", fromPartial.bgColor());
        assertEquals(3, fromPartial.decimals());
        assertNull(fromPartial.strike());
        assertNull(fromPartial.valign());
    }
}
