package com.orbit.cloud.service;

import com.orbit.cloud.dto.OfficeSlideContentDto;
import com.orbit.cloud.dto.SlideItemDto;
import com.orbit.common.ApiException;
import java.awt.geom.Rectangle2D;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.apache.poi.sl.usermodel.Placeholder;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFNotes;
import org.apache.poi.xslf.usermodel.XSLFShape;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xslf.usermodel.XSLFTextBox;
import org.apache.poi.xslf.usermodel.XSLFTextParagraph;
import org.apache.poi.xslf.usermodel.XSLFTextRun;
import org.apache.poi.xslf.usermodel.XSLFTextShape;
import org.springframework.stereotype.Component;

/** Apache POI codec converting .pptx presentations to and from structured Orbit Native Office Slides. */
@Component
public class PptxOfficeCodec {

    public OfficeSlideContentDto read(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return new OfficeSlideContentDto(List.of(new SlideItemDto("", "", List.of(), "")));
        }
        try (XMLSlideShow ppt = new XMLSlideShow(new ByteArrayInputStream(bytes))) {
            List<SlideItemDto> slides = new ArrayList<>();
            for (XSLFSlide slide : ppt.getSlides()) {
                slides.add(readSlide(slide));
            }
            if (slides.isEmpty()) {
                slides.add(new SlideItemDto("", "", List.of(), ""));
            }
            return new OfficeSlideContentDto(slides);
        } catch (IOException | RuntimeException ex) {
            throw ApiException.badRequest("INVALID_PPTX", "Unable to parse PPTX presentation.");
        }
    }

    public byte[] write(OfficeSlideContentDto content) {
        try (XMLSlideShow ppt = new XMLSlideShow(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            List<SlideItemDto> items = content != null && content.slides() != null && !content.slides().isEmpty()
                ? content.slides()
                : List.of(new SlideItemDto("", "", List.of(), ""));
            for (SlideItemDto item : items) {
                if (item == null) continue;
                XSLFSlide slide = ppt.createSlide();
                writeTextBox(slide, new Rectangle2D.Double(40, 30, 640, 60), item.title(), 28.0, true);
                writeTextBox(slide, new Rectangle2D.Double(40, 100, 640, 45), item.subtitle(), 18.0, false);
                writeBulletsBox(slide, item.bullets());
                writeSpeakerNotes(ppt, slide, item.notes());
            }
            ppt.write(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw ApiException.badRequest("PPTX_WRITE_FAILED", "Failed to serialize PPTX presentation.");
        }
    }

    private static SlideItemDto readSlide(XSLFSlide slide) {
        List<XSLFTextShape> textShapes = new ArrayList<>();
        for (XSLFShape shape : slide.getShapes()) {
            if (shape instanceof XSLFTextShape ts) {
                textShapes.add(ts);
            }
        }
        String title = textShapes.size() >= 1 && textShapes.get(0).getText() != null ? textShapes.get(0).getText() : "";
        String subtitle = textShapes.size() >= 2 && textShapes.get(1).getText() != null ? textShapes.get(1).getText() : "";
        List<String> bullets = new ArrayList<>();
        for (int i = 2; i < textShapes.size(); i++) {
            for (XSLFTextParagraph p : textShapes.get(i).getTextParagraphs()) {
                String t = p.getText() != null ? p.getText() : "";
                if (!t.isEmpty() || p.isBullet()) {
                    bullets.add(t);
                }
            }
        }
        return new SlideItemDto(title, subtitle, bullets, readSpeakerNotes(slide));
    }

    private static void writeTextBox(XSLFSlide slide, Rectangle2D anchor, String text, double fontSize, boolean bold) {
        XSLFTextBox box = slide.createTextBox();
        box.clearText();
        box.setAnchor(anchor);
        XSLFTextParagraph p = box.addNewTextParagraph();
        p.setBullet(false);
        XSLFTextRun r = p.addNewTextRun();
        r.setText(text != null ? text : "");
        r.setFontSize(fontSize);
        r.setBold(bold);
    }

    private static void writeBulletsBox(XSLFSlide slide, List<String> bullets) {
        XSLFTextBox box = slide.createTextBox();
        box.clearText();
        box.setAnchor(new Rectangle2D.Double(40, 160, 640, 300));
        if (bullets == null || bullets.isEmpty()) return;
        for (String bullet : bullets) {
            XSLFTextParagraph p = box.addNewTextParagraph();
            p.setBullet(true);
            XSLFTextRun r = p.addNewTextRun();
            r.setText(bullet != null ? bullet : "");
            r.setFontSize(16.0);
        }
    }

    private static void writeSpeakerNotes(XMLSlideShow ppt, XSLFSlide slide, String notes) {
        if (notes == null || notes.isEmpty()) return;
        XSLFNotes notesSlide = ppt.getNotesSlide(slide);
        XSLFTextShape target = findNotesTextShape(notesSlide);
        if (target != null) {
            target.clearText();
            target.addNewTextParagraph().addNewTextRun().setText(notes);
        } else {
            XSLFTextBox box = notesSlide.createTextBox();
            box.clearText();
            box.addNewTextParagraph().addNewTextRun().setText(notes);
        }
    }

    private static String readSpeakerNotes(XSLFSlide slide) {
        XSLFNotes notesSlide = slide.getNotes();
        if (notesSlide == null) return "";
        XSLFTextShape target = findNotesTextShape(notesSlide);
        return target != null && target.getText() != null ? target.getText() : "";
    }

    private static XSLFTextShape findNotesTextShape(XSLFNotes notesSlide) {
        XSLFTextShape fallbackBox = null;
        for (XSLFShape shape : notesSlide.getShapes()) {
            if (shape instanceof XSLFTextShape ts) {
                if (ts.getTextType() == Placeholder.BODY) return ts;
                if (ts.getTextType() == null && fallbackBox == null) fallbackBox = ts;
            }
        }
        return fallbackBox;
    }
}
