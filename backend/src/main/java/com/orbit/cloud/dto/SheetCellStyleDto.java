package com.orbit.cloud.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record SheetCellStyleDto(
    Boolean bold,
    Boolean italic,
    Boolean underline,
    Boolean highlight,
    String align,
    String numFmt
) {
    public boolean isEmpty() {
        return !Boolean.TRUE.equals(bold)
            && !Boolean.TRUE.equals(italic)
            && !Boolean.TRUE.equals(underline)
            && !Boolean.TRUE.equals(highlight)
            && (align == null || align.isBlank())
            && (numFmt == null || numFmt.isBlank());
    }
}
