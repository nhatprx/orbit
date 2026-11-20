package com.orbit.ai.rag;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.orbit.ai.rag.DocumentTextExtractor.ExtractedPage;
import com.orbit.ai.rag.TextChunker.TextChunk;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.Test;

class DocumentTextExtractorAndChunkerTest {

    private final DocumentTextExtractor extractor = new DocumentTextExtractor();
    private final TextChunker chunker = new TextChunker();

    @Test
    void extractsTextAndPageNumberFromPdf() throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                cs.newLineAtOffset(50, 700);
                cs.showText("Orbit PDF RAG Verification Content");
                cs.endText();
            }
            doc.save(out);
        }

        List<ExtractedPage> pages = extractor.extract(out.toByteArray(), "application/pdf", "spec.pdf");
        assertEquals(1, pages.size());
        assertEquals(1, pages.get(0).pageNumber());
        assertTrue(pages.get(0).text().contains("Orbit PDF RAG Verification Content"));
    }

    @Test
    void extractsParagraphsFromDocx() throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (XWPFDocument doc = new XWPFDocument()) {
            doc.createParagraph().createRun().setText("Orbit DOCX Architecture Notes");
            doc.write(out);
        }

        List<ExtractedPage> pages = extractor.extract(
            out.toByteArray(),
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "notes.docx"
        );
        assertEquals(1, pages.size());
        assertTrue(pages.get(0).text().contains("Orbit DOCX Architecture Notes"));
    }

    @Test
    void chunksLongMarkdownWithOverlapAndBounds() {
        String longText = ("Orbit RAG chunking test sentence for verification. ").repeat(45);
        List<ExtractedPage> pages = List.of(new ExtractedPage(2, longText));
        List<TextChunk> chunks = chunker.chunk(pages);

        assertTrue(chunks.size() >= 2);
        assertEquals(0, chunks.get(0).chunkIndex());
        assertEquals(2, chunks.get(0).pageNumber());
        assertFalse(chunks.get(1).content().isBlank());
    }

    @Test
    void detectsSupportedAndUnsupportedFormats() throws Exception {
        assertTrue(extractor.isSupported("application/pdf", "a.pdf"));
        assertTrue(extractor.isSupported("text/markdown", "README.md"));
        assertFalse(extractor.isSupported("image/png", "logo.png"));
        List<ExtractedPage> md = extractor.extract("# Hello Orbit".getBytes(StandardCharsets.UTF_8), "text/markdown", "README.md");
        assertEquals("# Hello Orbit", md.get(0).text());
    }
}
