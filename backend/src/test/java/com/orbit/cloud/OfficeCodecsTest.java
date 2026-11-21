package com.orbit.cloud;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.orbit.cloud.dto.DocBlockDto;
import com.orbit.cloud.dto.DocTableDto;
import com.orbit.cloud.dto.DocumentTemplateType;
import com.orbit.cloud.dto.OfficeDocContentDto;
import com.orbit.cloud.dto.OfficeSheetContentDto;
import com.orbit.cloud.dto.OfficeSlideContentDto;
import com.orbit.cloud.dto.SheetCellStyleDto;
import com.orbit.cloud.dto.SheetTabDto;
import com.orbit.cloud.dto.SlideItemDto;
import com.orbit.cloud.service.DocxOfficeCodec;
import com.orbit.cloud.service.OoxmlTemplateGenerator;
import com.orbit.cloud.service.PptxOfficeCodec;
import com.orbit.cloud.service.XlsxOfficeCodec;
import com.orbit.common.ApiException;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.apache.poi.xwpf.usermodel.Borders;
import org.apache.poi.xwpf.usermodel.ParagraphAlignment;
import org.apache.poi.xwpf.usermodel.UnderlinePatterns;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.junit.jupiter.api.Test;

class OfficeCodecsTest {

    private final DocxOfficeCodec docxCodec = new DocxOfficeCodec();
    private final XlsxOfficeCodec xlsxCodec = new XlsxOfficeCodec();
    private final PptxOfficeCodec pptxCodec = new PptxOfficeCodec();
    private final OoxmlTemplateGenerator templateGenerator = new OoxmlTemplateGenerator();

    @Test
    void docxRoundTripsBlocksAlignmentsHrTablesAndBlankTemplate() throws Exception {
        OfficeDocContentDto input = new OfficeDocContentDto(
            List.of(
                new DocBlockDto("h1", "Orbit Architecture Overview", "center"),
                new DocBlockDto("h2", "Storage Layer", "left"),
                new DocBlockDto("h3", "Replication Strategy", "right"),
                new DocBlockDto("p", "Justified paragraph body text.", "justify"),
                new DocBlockDto("hr", "", "left"),
                new DocBlockDto("quote", "Simplicity scales reliably.", "left"),
                new DocBlockDto("code", "mvn test -Dtest=OfficeCodecsTest", "left"),
                new DocBlockDto("ul", "Bullet point item", "left"),
                new DocBlockDto("ol", "Numbered step item", "left")
            ),
            List.of(new DocTableDto(List.of(
                List.of("<b>Service</b>", "Status"),
                List.of("Orbit Docs", "READY")
            )))
        );

        byte[] bytes = docxCodec.write(input);
        try (XWPFDocument poiDoc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            assertEquals(ParagraphAlignment.BOTH, poiDoc.getParagraphs().get(3).getAlignment());
            assertEquals(Borders.SINGLE, poiDoc.getParagraphs().get(4).getBorderBottom());
        }

        OfficeDocContentDto parsed = docxCodec.read(bytes);
        assertEquals(input.blocks(), parsed.blocks());
        assertEquals(input.tables(), parsed.tables());

        OfficeDocContentDto fromBlank = docxCodec.read(templateGenerator.generate(DocumentTemplateType.DOCX).bytes());
        assertEquals(1, fromBlank.blocks().size());
        assertThrows(ApiException.class, () -> docxCodec.read("not-a-zip".getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void docxParsesInlineHtmlIntoRealPoiRunsAndRoundTripsCleanly() throws Exception {
        String richHtml = "Plain <strong>bold</strong> <em>italic</em> <u>under</u> <del>gone</del> "
            + "<code>const x = 1</code> <b><i>both</i></b> a &lt; b <script>alert(1)</script><span>safe</span>";
        OfficeDocContentDto input = new OfficeDocContentDto(
            List.of(new DocBlockDto("p", richHtml, "left")),
            List.of()
        );

        byte[] bytes = docxCodec.write(input);
        try (XWPFDocument poiDoc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            XWPFParagraph para = poiDoc.getParagraphs().get(0);
            String rawText = para.getText();
            assertFalse(rawText.contains("<strong>"));
            assertFalse(rawText.contains("<b>"));
            assertFalse(rawText.contains("<script>"));
            assertFalse(rawText.contains("alert(1)"));
            assertTrue(rawText.contains("a < b"));
            assertTrue(para.getRuns().stream().anyMatch(XWPFRun::isBold));
            assertTrue(para.getRuns().stream().anyMatch(XWPFRun::isItalic));
            assertTrue(para.getRuns().stream().anyMatch(r -> r.getUnderline() == UnderlinePatterns.SINGLE));
            assertTrue(para.getRuns().stream().anyMatch(XWPFRun::isStrikeThrough));
            assertTrue(para.getRuns().stream().anyMatch(r -> "Courier New".equals(r.getFontFamily())));
        }

        OfficeDocContentDto parsed = docxCodec.read(bytes);
        String roundTripped = parsed.blocks().get(0).text();
        assertEquals(
            "Plain <b>bold</b> <i>italic</i> <u>under</u> <s>gone</s> "
                + "<code>const x = 1</code> <b><i>both</i></b> a &lt; b safe",
            roundTripped
        );
    }

    @Test
    void xlsxRoundTripsValuesFormulasAndCellStyles() {
        Map<String, SheetCellStyleDto> styles = Map.of(
            "0:0", basicStyle(true, false, true, true, null, "center", null, null),
            "1:2", basicStyle(null, true, null, null, null, "right", "currency", null),
            "1:3", basicStyle(true, null, null, null, null, "right", "percent", null),
            "2:2", basicStyle(null, null, null, null, null, "left", "decimal", null),
            "4:1", basicStyle(true, null, null, null, null, null, null, null)
        );
        OfficeSheetContentDto input = new OfficeSheetContentDto(List.of(
            new SheetTabDto("Budget Q1", List.of(
                List.of("Item", "Qty", "Cost", "Margin"),
                List.of("Compute", "2", "150.5", "0.25"),
                List.of("Storage", "1", "49", "=SUM(C2:C3)"),
                List.of("BadFormula", "", "=INVALID(((", "007")
            ), styles),
            new SheetTabDto("Metrics", List.of(List.of("LatencyMs", "12")))
        ));

        byte[] bytes = xlsxCodec.write(input);
        OfficeSheetContentDto parsed = xlsxCodec.read(bytes);
        assertEquals(2, parsed.sheets().size());
        SheetTabDto budget = parsed.sheets().get(0);
        assertEquals("Budget Q1", budget.name());
        assertEquals(input.sheets().get(0).rows().subList(0, 4), budget.rows().subList(0, 4));
        assertEquals(basicStyle(true, null, true, true, "#052E16", "center", null, null), budget.cellStyles().get("0:0"));
        assertEquals(basicStyle(null, true, null, null, null, "right", "currency", 2), budget.cellStyles().get("1:2"));
        assertEquals(basicStyle(true, null, null, null, null, "right", "percent", 1), budget.cellStyles().get("1:3"));
        assertEquals(basicStyle(null, null, null, null, null, "left", "number", 2), budget.cellStyles().get("2:2"));
        assertEquals(basicStyle(true, null, null, null, null, null, null, null), budget.cellStyles().get("4:1"));

        OfficeSheetContentDto fromBlank = xlsxCodec.read(templateGenerator.generate(DocumentTemplateType.XLSX).bytes());
        assertEquals(1, fromBlank.sheets().size());
        assertEquals("Sheet1", fromBlank.sheets().get(0).name());
        assertThrows(ApiException.class, () -> xlsxCodec.read("corrupt".getBytes(StandardCharsets.UTF_8)));
    }

    private static SheetCellStyleDto basicStyle(
        Boolean b, Boolean i, Boolean u, Boolean hl, String bg, String align, String fmt, Integer dec
    ) {
        return new SheetCellStyleDto(b, i, u, null, hl, null, null, bg, null, align, null, null, fmt, dec);
    }

    @Test
    void pptxRoundTripsSlidesTitlesSubtitlesBulletsNotesAndBlankTemplate() {
        OfficeSlideContentDto input = new OfficeSlideContentDto(List.of(
            new SlideItemDto(
                "Orbit Native Office",
                "Zero-Container Inline OOXML Suite",
                List.of("Apache POI DOCX Codec", "XLSX Formula Grid", "PPTX Slide Stage"),
                "Emphasize zero external container footprint."
            ),
            new SlideItemDto(
                "Q4 Rollout Plan",
                "Production Milestones",
                List.of("Phase 1 Verification", "Phase 2 Telemetry"),
                ""
            )
        ));

        byte[] bytes = pptxCodec.write(input);
        OfficeSlideContentDto parsed = pptxCodec.read(bytes);
        assertEquals(input.slides(), parsed.slides());

        OfficeSlideContentDto fromBlank = pptxCodec.read(templateGenerator.generate(DocumentTemplateType.PPTX).bytes());
        assertEquals(1, fromBlank.slides().size());
        assertThrows(ApiException.class, () -> pptxCodec.read("bad-pptx".getBytes(StandardCharsets.UTF_8)));
    }
}
