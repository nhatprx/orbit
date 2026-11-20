package com.orbit.cloud;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.orbit.cloud.dto.DocumentTemplateType;
import com.orbit.cloud.service.OoxmlTemplateGenerator;
import com.orbit.cloud.service.OoxmlTemplateGenerator.GeneratedTemplate;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.HashSet;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.junit.jupiter.api.Test;

class OoxmlTemplateGeneratorTest {

    private final OoxmlTemplateGenerator generator = new OoxmlTemplateGenerator();

    @Test
    void generatesValidDocxXlsxAndPptxArchives() throws IOException {
        GeneratedTemplate docx = generator.generate(DocumentTemplateType.DOCX);
        assertEquals("application/vnd.openxmlformats-officedocument.wordprocessingml.document", docx.mimeType());
        Set<String> docxEntries = readZipEntryNames(docx.bytes());
        assertTrue(docxEntries.contains("[Content_Types].xml"));
        assertTrue(docxEntries.contains("_rels/.rels"));
        assertTrue(docxEntries.contains("word/document.xml"));

        GeneratedTemplate xlsx = generator.generate(DocumentTemplateType.XLSX);
        assertEquals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xlsx.mimeType());
        Set<String> xlsxEntries = readZipEntryNames(xlsx.bytes());
        assertTrue(xlsxEntries.contains("[Content_Types].xml"));
        assertTrue(xlsxEntries.contains("xl/workbook.xml"));
        assertTrue(xlsxEntries.contains("xl/worksheets/sheet1.xml"));

        GeneratedTemplate pptx = generator.generate(DocumentTemplateType.PPTX);
        assertEquals("application/vnd.openxmlformats-officedocument.presentationml.presentation", pptx.mimeType());
        Set<String> pptxEntries = readZipEntryNames(pptx.bytes());
        assertTrue(pptxEntries.contains("[Content_Types].xml"));
        assertTrue(pptxEntries.contains("ppt/presentation.xml"));
        assertTrue(pptxEntries.contains("ppt/slides/slide1.xml"));
    }

    @Test
    void generatesEmptyUtf8BytesForTxtAndMd() {
        GeneratedTemplate txt = generator.generate(DocumentTemplateType.TXT);
        assertEquals(0, txt.bytes().length);
        assertEquals("text/plain", txt.mimeType());

        GeneratedTemplate md = generator.generate(DocumentTemplateType.MD);
        assertEquals(0, md.bytes().length);
        assertEquals("text/markdown", md.mimeType());
    }

    @Test
    void ensuresExtensionWithoutDuplication() {
        assertEquals("notes.md", generator.ensureExtension("notes", DocumentTemplateType.MD));
        assertEquals("notes.MD", generator.ensureExtension("notes.MD", DocumentTemplateType.MD));
        assertEquals("budget.xlsx", generator.ensureExtension("budget", DocumentTemplateType.XLSX));
        assertEquals("deck.pptx", generator.ensureExtension("deck.pptx", DocumentTemplateType.PPTX));
    }

    private static Set<String> readZipEntryNames(byte[] zipBytes) throws IOException {
        Set<String> names = new HashSet<>();
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(zipBytes))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                names.add(entry.getName());
            }
        }
        return names;
    }
}
