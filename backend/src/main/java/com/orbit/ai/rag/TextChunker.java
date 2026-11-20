package com.orbit.ai.rag;

import com.orbit.ai.rag.DocumentTextExtractor.ExtractedPage;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

/** Splits extracted document pages into bounded overlapping chunks for embedding & FTS. */
@Component
public class TextChunker {

    private static final int CHUNK_SIZE = 1000;
    private static final int OVERLAP = 150;
    private static final int MAX_CHUNKS = 80;

    public record TextChunk(int chunkIndex, Integer pageNumber, String content) {}

    public List<TextChunk> chunk(List<ExtractedPage> pages) {
        List<TextChunk> out = new ArrayList<>();
        int index = 0;
        for (ExtractedPage page : pages) {
            if (page.text() == null || page.text().isBlank()) continue;
            String normalized = page.text().replace("\r\n", "\n").trim();
            int pos = 0;
            while (pos < normalized.length() && out.size() < MAX_CHUNKS) {
                int end = Math.min(normalized.length(), pos + CHUNK_SIZE);
                if (end < normalized.length()) {
                    int breakAt = findBreakPoint(normalized, pos, end);
                    if (breakAt > pos + (CHUNK_SIZE / 2)) end = breakAt;
                }
                String slice = normalized.substring(pos, end).trim();
                if (!slice.isEmpty()) {
                    out.add(new TextChunk(index++, page.pageNumber(), slice));
                }
                if (end >= normalized.length()) break;
                pos = Math.max(pos + 1, end - OVERLAP);
            }
            if (out.size() >= MAX_CHUNKS) break;
        }
        return out;
    }

    private int findBreakPoint(String text, int start, int end) {
        int nl = text.lastIndexOf('\n', end);
        if (nl > start) return nl;
        int sp = text.lastIndexOf(' ', end);
        return sp > start ? sp : end;
    }
}
