package com.orbit.cloud.service;

import com.orbit.cloud.dto.DocumentTemplateType;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.springframework.stereotype.Component;

/** Pure-Java generator for blank text, markdown, and minimal valid OOXML documents. */
@Component
public class OoxmlTemplateGenerator {

    public record GeneratedTemplate(byte[] bytes, String mimeType, String extension) {}

    public GeneratedTemplate generate(DocumentTemplateType type) {
        return switch (type) {
            case TXT -> new GeneratedTemplate(new byte[0], "text/plain", ".txt");
            case MD -> new GeneratedTemplate(new byte[0], "text/markdown", ".md");
            case DOCX -> new GeneratedTemplate(
                buildZip(docxEntries()),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".docx"
            );
            case XLSX -> new GeneratedTemplate(
                buildZip(xlsxEntries()),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ".xlsx"
            );
            case PPTX -> new GeneratedTemplate(
                buildZip(pptxEntries()),
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                ".pptx"
            );
        };
    }

    public String ensureExtension(String validName, DocumentTemplateType type) {
        String ext = extensionFor(type);
        if (validName.toLowerCase(Locale.ROOT).endsWith(ext)) {
            return validName;
        }
        return validName + ext;
    }

    public String extensionFor(DocumentTemplateType type) {
        return switch (type) {
            case TXT -> ".txt";
            case MD -> ".md";
            case DOCX -> ".docx";
            case XLSX -> ".xlsx";
            case PPTX -> ".pptx";
        };
    }

    private static Map<String, String> docxEntries() {
        Map<String, String> entries = new LinkedHashMap<>();
        entries.put("[Content_Types].xml", OoxmlXmlTemplates.DOCX_CONTENT_TYPES);
        entries.put("_rels/.rels", OoxmlXmlTemplates.DOCX_RELS);
        entries.put("word/document.xml", OoxmlXmlTemplates.DOCX_DOCUMENT);
        entries.put("word/_rels/document.xml.rels", OoxmlXmlTemplates.EMPTY_RELS);
        return entries;
    }

    private static Map<String, String> xlsxEntries() {
        Map<String, String> entries = new LinkedHashMap<>();
        entries.put("[Content_Types].xml", OoxmlXmlTemplates.XLSX_CONTENT_TYPES);
        entries.put("_rels/.rels", OoxmlXmlTemplates.XLSX_RELS);
        entries.put("xl/workbook.xml", OoxmlXmlTemplates.XLSX_WORKBOOK);
        entries.put("xl/_rels/workbook.xml.rels", OoxmlXmlTemplates.XLSX_WORKBOOK_RELS);
        entries.put("xl/worksheets/sheet1.xml", OoxmlXmlTemplates.XLSX_SHEET1);
        return entries;
    }

    private static Map<String, String> pptxEntries() {
        Map<String, String> entries = new LinkedHashMap<>();
        entries.put("[Content_Types].xml", OoxmlXmlTemplates.PPTX_CONTENT_TYPES);
        entries.put("_rels/.rels", OoxmlXmlTemplates.PPTX_RELS);
        entries.put("ppt/presentation.xml", OoxmlXmlTemplates.PPTX_PRESENTATION);
        entries.put("ppt/_rels/presentation.xml.rels", OoxmlXmlTemplates.PPTX_PRESENTATION_RELS);
        entries.put("ppt/slides/slide1.xml", OoxmlXmlTemplates.PPTX_SLIDE1);
        return entries;
    }

    private static byte[] buildZip(Map<String, String> entries) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(baos, StandardCharsets.UTF_8)) {
            for (Map.Entry<String, String> entry : entries.entrySet()) {
                zos.putNextEntry(new ZipEntry(entry.getKey()));
                zos.write(entry.getValue().trim().getBytes(StandardCharsets.UTF_8));
                zos.closeEntry();
            }
            zos.finish();
            return baos.toByteArray();
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to build OOXML archive", ex);
        }
    }
}
