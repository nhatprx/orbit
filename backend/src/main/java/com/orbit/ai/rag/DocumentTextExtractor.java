package com.orbit.ai.rag;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.stereotype.Component;

/** Extracts plain text segments from PDF, DOCX, Markdown, and source code files. */
@Component
public class DocumentTextExtractor {

    private static final int MAX_PDF_PAGES = 100;

    public record ExtractedPage(Integer pageNumber, String text) {}

    public boolean isSupported(String mimeType, String filename) {
        String mime = mimeType != null ? mimeType.toLowerCase(Locale.ROOT) : "";
        String name = filename != null ? filename.toLowerCase(Locale.ROOT) : "";
        if (isPdf(mime, name) || isDocx(mime, name)) return true;
        if (mime.startsWith("text/") || mime.contains("json") || mime.contains("xml")
            || mime.contains("yaml") || mime.contains("javascript") || mime.contains("csv")) {
            return true;
        }
        return name.endsWith(".md") || name.endsWith(".txt") || name.endsWith(".json")
            || name.endsWith(".yml") || name.endsWith(".yaml") || name.endsWith(".csv")
            || name.endsWith(".java") || name.endsWith(".ts") || name.endsWith(".tsx")
            || name.endsWith(".js") || name.endsWith(".jsx") || name.endsWith(".py")
            || name.endsWith(".sql") || name.endsWith(".html") || name.endsWith(".css");
    }

    public List<ExtractedPage> extract(byte[] bytes, String mimeType, String filename) throws IOException {
        if (bytes == null || bytes.length == 0) return List.of();
        String mime = mimeType != null ? mimeType.toLowerCase(Locale.ROOT) : "";
        String name = filename != null ? filename.toLowerCase(Locale.ROOT) : "";
        if (isPdf(mime, name)) return extractPdf(bytes);
        if (isDocx(mime, name)) return extractDocx(bytes);
        String text = new String(bytes, StandardCharsets.UTF_8).trim();
        return text.isEmpty() ? List.of() : List.of(new ExtractedPage(null, text));
    }

    private List<ExtractedPage> extractPdf(byte[] bytes) throws IOException {
        List<ExtractedPage> pages = new ArrayList<>();
        try (PDDocument doc = Loader.loadPDF(bytes)) {
            int total = Math.min(doc.getNumberOfPages(), MAX_PDF_PAGES);
            PDFTextStripper stripper = new PDFTextStripper();
            for (int page = 1; page <= total; page++) {
                stripper.setStartPage(page);
                stripper.setEndPage(page);
                String text = stripper.getText(doc).trim();
                if (!text.isEmpty()) {
                    pages.add(new ExtractedPage(page, text));
                }
            }
        }
        return pages;
    }

    private List<ExtractedPage> extractDocx(byte[] bytes) throws IOException {
        StringBuilder sb = new StringBuilder();
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            for (XWPFParagraph p : doc.getParagraphs()) {
                String text = p.getText();
                if (text != null && !text.isBlank()) sb.append(text.trim()).append("\n");
            }
            for (XWPFTable table : doc.getTables()) {
                for (XWPFTableRow row : table.getRows()) {
                    List<String> cells = new ArrayList<>();
                    for (XWPFTableCell cell : row.getTableCells()) {
                        String t = cell.getText();
                        if (t != null && !t.isBlank()) cells.add(t.trim());
                    }
                    if (!cells.isEmpty()) sb.append(String.join(" | ", cells)).append("\n");
                }
            }
        }
        String text = sb.toString().trim();
        return text.isEmpty() ? List.of() : List.of(new ExtractedPage(null, text));
    }

    private boolean isPdf(String mime, String name) {
        return mime.contains("pdf") || name.endsWith(".pdf");
    }

    private boolean isDocx(String mime, String name) {
        return mime.contains("wordprocessingml") || name.endsWith(".docx");
    }
}
