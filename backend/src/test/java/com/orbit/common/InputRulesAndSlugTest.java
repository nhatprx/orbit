package com.orbit.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class InputRulesAndSlugTest {

    @Test
    void slugifyHandlesVietnameseSymbolsAndEmptyNames() {
        // "Da Nang Team" spelled with Vietnamese diacritics, built from code points to keep sources ASCII.
        String vietnamese = new StringBuilder()
            .appendCodePoint(0x0110).appendCodePoint(0x00E0).append(" N")
            .appendCodePoint(0x1EB5).append("ng Team")
            .toString();
        assertEquals("da-nang-team", SlugGenerator.slugify(vietnamese, "x"));
        // Lowercase d with stroke, as in the Vietnamese word for "street".
        String lowercase = new StringBuilder()
            .appendCodePoint(0x0111).appendCodePoint(0x01B0).appendCodePoint(0x1EDD).append("ng")
            .toString();
        assertEquals("duong", SlugGenerator.slugify(lowercase, "x"));
        assertEquals("acme-engineering", SlugGenerator.slugify("  Acme   Engineering!!  ", "x"));
        assertEquals("c-c", SlugGenerator.slugify("C++ & C#", "x"));
        assertEquals("workspace", SlugGenerator.slugify("***", "workspace"));
        assertEquals("workspace", SlugGenerator.slugify(null, "workspace"));
    }

    @Test
    void slugifyTruncatesWithoutTrailingDash() {
        String slug = SlugGenerator.slugify("a".repeat(59) + " b" + "c".repeat(30), "x");
        assertTrue(slug.length() <= 60);
        assertFalse(slug.endsWith("-"));
    }

    @Test
    void uniqueSlugAppendsIncreasingSuffixes() {
        Set<String> taken = Set.of("acme", "acme-2", "acme-3");
        assertEquals("acme-4", SlugGenerator.unique("Acme", "x", taken::contains));
        assertEquals("fresh", SlugGenerator.unique("Fresh", "x", taken::contains));
        String exhausted = SlugGenerator.unique("Acme", "x", s -> true);
        assertTrue(exhausted.startsWith("acme-"));
        assertEquals(13, exhausted.length());
    }

    @Test
    void avatarUrlAcceptsOnlyAbsoluteHttpUrls() {
        assertEquals("https://example.com/a.png", InputRules.avatarUrl(" https://example.com/a.png "));
        assertEquals("http://localhost:5173/a.png", InputRules.avatarUrl("http://localhost:5173/a.png"));
        assertNull(InputRules.avatarUrl("   "));
        assertNull(InputRules.avatarUrl(null));
        for (String bad : List.of("javascript:alert(1)", "data:image/png;base64,AAAA", "ftp://x.com/a", "/relative.png", "https://", "http://exa mple.com")) {
            ApiException ex = assertThrows(ApiException.class, () -> InputRules.avatarUrl(bad), bad);
            assertEquals("VALIDATION_ERROR", ex.getCode());
        }
    }

    @Test
    void emailsAreLowercasedTrimmedAndDeduplicated() {
        assertEquals(List.of("a@x.com", "b@x.com"), InputRules.normalizeEmails(List.of(" A@x.com", "a@X.com", "b@x.com", "  ")));
        assertTrue(InputRules.normalizeEmails(null).isEmpty());
        assertNull(InputRules.blankToNull("  "));
        assertEquals("x", InputRules.blankToNull(" x "));
    }

    @Test
    void pageParamsClampSizeAndPage() {
        assertEquals(1, PageParams.clampSize(0));
        assertEquals(1, PageParams.clampSize(-5));
        assertEquals(25, PageParams.clampSize(25));
        assertEquals(100, PageParams.clampSize(100_000));
        assertEquals(0, PageParams.of(-3, 10).getPageNumber());
    }
}
