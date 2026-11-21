package com.orbit.cloud.service;

import com.orbit.cloud.dto.DocBlockDto;
import com.orbit.cloud.dto.DocTableDto;
import com.orbit.cloud.dto.OfficeDocContentDto;
import com.orbit.common.ApiException;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.apache.poi.xwpf.usermodel.ParagraphAlignment;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.stereotype.Component;

/** Apache POI codec converting .docx binaries to and from structured Orbit Native Office Doc blocks and tables. */
@Component
public class DocxOfficeCodec {

    public OfficeDocContentDto read(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return new OfficeDocContentDto(List.of(new DocBlockDto("p", "", "left")), List.of());
        }
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            List<DocBlockDto> blocks = new ArrayList<>();
            for (XWPFParagraph para : doc.getParagraphs()) {
                String text = para.getText() != null ? para.getText() : "";
                String type = detectBlockType(para);
                String align = detectAlign(para.getAlignment());
                blocks.add(new DocBlockDto(type, text, align));
            }
            List<DocTableDto> tables = new ArrayList<>();
            for (XWPFTable table : doc.getTables()) {
                List<List<String>> rows = new ArrayList<>();
                for (XWPFTableRow row : table.getRows()) {
                    List<String> cells = new ArrayList<>();
                    for (XWPFTableCell cell : row.getTableCells()) {
                        cells.add(cell.getText() != null ? cell.getText() : "");
                    }
                    rows.add(cells);
                }
                if (!rows.isEmpty()) {
                    tables.add(new DocTableDto(rows));
                }
            }
            if (blocks.isEmpty() && tables.isEmpty()) {
                blocks.add(new DocBlockDto("p", "", "left"));
            }
            return new OfficeDocContentDto(blocks, tables);
        } catch (IOException | RuntimeException ex) {
            throw ApiException.badRequest("INVALID_DOCX", "Unable to parse DOCX document.");
        }
    }

    public byte[] write(OfficeDocContentDto content) {
        try (XWPFDocument doc = new XWPFDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            List<DocBlockDto> blocks = content != null && content.blocks() != null ? content.blocks() : List.of();
            for (DocBlockDto block : blocks) {
                if (block == null) continue;
                XWPFParagraph para = doc.createParagraph();
                String type = normalizeType(block.type());
                para.setStyle(styleForType(type));
                para.setAlignment(alignmentFor(block.align()));
                XWPFRun run = para.createRun();
                applyRunFormatting(para, run, type);
                run.setText(block.text() != null ? block.text() : "");
            }
            List<DocTableDto> tables = content != null && content.tables() != null ? content.tables() : List.of();
            for (DocTableDto tableDto : tables) {
                if (tableDto == null || tableDto.rows() == null || tableDto.rows().isEmpty()) continue;
                List<List<String>> rows = tableDto.rows();
                int colCount = rows.stream().mapToInt(r -> r == null ? 0 : r.size()).max().orElse(1);
                colCount = Math.max(colCount, 1);
                XWPFTable table = doc.createTable(rows.size(), colCount);
                for (int r = 0; r < rows.size(); r++) {
                    List<String> rowCells = rows.get(r);
                    if (rowCells == null) continue;
                    XWPFTableRow tableRow = table.getRow(r);
                    for (int c = 0; c < rowCells.size(); c++) {
                        String val = rowCells.get(c);
                        tableRow.getCell(c).setText(val != null ? val : "");
                    }
                }
            }
            doc.write(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw ApiException.badRequest("DOCX_WRITE_FAILED", "Failed to serialize DOCX document.");
        }
    }

    private static String detectBlockType(XWPFParagraph para) {
        String style = para.getStyle() != null ? para.getStyle().toLowerCase(Locale.ROOT) : "";
        if (style.contains("heading1") || style.contains("heading 1") || style.equals("h1")) return "h1";
        if (style.contains("heading2") || style.contains("heading 2") || style.equals("h2")) return "h2";
        if (style.contains("heading3") || style.contains("heading 3") || style.equals("h3")) return "h3";
        if (style.contains("quote")) return "quote";
        if (style.contains("code")) return "code";
        if (style.contains("listbullet") || style.contains("bullet") || style.equals("ul")) return "ul";
        if (style.contains("listnumber") || style.contains("number") || style.equals("ol")) return "ol";
        if (para.getNumFmt() != null) {
            return "bullet".equalsIgnoreCase(para.getNumFmt()) ? "ul" : "ol";
        }
        if (!para.getRuns().isEmpty()) {
            XWPFRun r = para.getRuns().get(0);
            int size = r.getFontSize();
            if (size >= 20) return "h1";
            if (size >= 16) return "h2";
            if (size >= 13 && r.isBold()) return "h3";
            String font = r.getFontFamily() != null ? r.getFontFamily().toLowerCase(Locale.ROOT) : "";
            if (font.contains("courier") || font.contains("mono")) return "code";
            if (r.isItalic() && para.getIndentationLeft() > 0) return "quote";
        }
        return "p";
    }

    private static String normalizeType(String type) {
        if (type == null) return "p";
        return switch (type.trim().toLowerCase(Locale.ROOT)) {
            case "h1", "h2", "h3", "quote", "code", "ul", "ol" -> type.trim().toLowerCase(Locale.ROOT);
            default -> "p";
        };
    }

    private static String styleForType(String type) {
        return switch (type) {
            case "h1" -> "Heading1";
            case "h2" -> "Heading2";
            case "h3" -> "Heading3";
            case "quote" -> "Quote";
            case "code" -> "Code";
            case "ul" -> "ListBullet";
            case "ol" -> "ListNumber";
            default -> "Normal";
        };
    }

    private static void applyRunFormatting(XWPFParagraph para, XWPFRun run, String type) {
        switch (type) {
            case "h1" -> { run.setBold(true); run.setFontSize(22); }
            case "h2" -> { run.setBold(true); run.setFontSize(18); }
            case "h3" -> { run.setBold(true); run.setFontSize(14); }
            case "quote" -> { run.setItalic(true); para.setIndentationLeft(360); }
            case "code" -> { run.setFontFamily("Courier New"); run.setFontSize(10); }
            default -> {}
        }
    }

    private static String detectAlign(ParagraphAlignment alignment) {
        if (alignment == ParagraphAlignment.CENTER) return "center";
        if (alignment == ParagraphAlignment.RIGHT) return "right";
        return "left";
    }

    private static ParagraphAlignment alignmentFor(String align) {
        if (align == null) return ParagraphAlignment.LEFT;
        return switch (align.trim().toLowerCase(Locale.ROOT)) {
            case "center" -> ParagraphAlignment.CENTER;
            case "right" -> ParagraphAlignment.RIGHT;
            default -> ParagraphAlignment.LEFT;
        };
    }
}
