package com.orbit.issues;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.orbit.issues.service.IssueKeyGenerator;
import org.junit.jupiter.api.Test;

class IssueKeyGeneratorTest {

    @Test
    void derivesInitialsForMultiWordSlugAndName() {
        assertEquals("PA", IssueKeyGenerator.derivePrefix("project-alpha", "Project Alpha"));
        assertEquals("OCP", IssueKeyGenerator.derivePrefix("orbit-core-platform", "Orbit Core Platform"));
        assertEquals("ABCDEF", IssueKeyGenerator.derivePrefix("a-b-c-d-e-f-g-h", null));
    }

    @Test
    void derivesSingleWordPrefixWithinLengthBounds() {
        assertEquals("ALPHA", IssueKeyGenerator.derivePrefix("alpha", "Alpha"));
        assertEquals("OR", IssueKeyGenerator.derivePrefix("or", null));
        assertEquals("INFRAS", IssueKeyGenerator.derivePrefix("infrastructure", null));
    }

    @Test
    void fallsBackToProjectNameThenDefaultPrefix() {
        assertEquals("CORE", IssueKeyGenerator.derivePrefix("123-456", "Core"));
        assertEquals("AP", IssueKeyGenerator.derivePrefix("x", "Alpha Platform"));
        assertEquals("ORB", IssueKeyGenerator.derivePrefix(null, null));
        assertEquals("ORB", IssueKeyGenerator.derivePrefix("   ", "12345"));
        assertEquals("ORB", IssueKeyGenerator.derivePrefix("a", "b"));
    }

    @Test
    void formatsIssueKeyAndRejectsNonPositiveNumbers() {
        assertEquals("PA-1", IssueKeyGenerator.formatKey("project-alpha", "Project Alpha", 1));
        assertEquals("ORB-42", IssueKeyGenerator.formatKey("", "", 42));
        assertThrows(IllegalArgumentException.class, () -> IssueKeyGenerator.formatKey("alpha", "Alpha", 0));
        assertThrows(IllegalArgumentException.class, () -> IssueKeyGenerator.formatKey("alpha", "Alpha", -5));
    }
}
