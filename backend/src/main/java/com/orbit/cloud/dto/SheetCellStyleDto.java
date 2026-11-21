package com.orbit.cloud.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record SheetCellStyleDto(
    Boolean bold,
    Boolean italic,
    Boolean underline,
    Boolean strike,
    Boolean highlight,
    Integer fontSize,
    String textColor,
    String bgColor,
    String border,
    String align,
    String valign,
    Boolean wrap,
    String numFmt,
    Integer decimals
) {
    public boolean isEmpty() {
        return !Boolean.TRUE.equals(bold)
            && !Boolean.TRUE.equals(italic)
            && !Boolean.TRUE.equals(underline)
            && !Boolean.TRUE.equals(strike)
            && !Boolean.TRUE.equals(highlight)
            && fontSize == null
            && (textColor == null || textColor.isBlank())
            && (bgColor == null || bgColor.isBlank())
            && (border == null || border.isBlank() || "none".equalsIgnoreCase(border.trim()))
            && (align == null || align.isBlank())
            && (valign == null || valign.isBlank())
            && !Boolean.TRUE.equals(wrap)
            && (numFmt == null || numFmt.isBlank() || "auto".equalsIgnoreCase(numFmt.trim()))
            && decimals == null;
    }
}
