package com.orbit.cloud.dto;

import java.util.List;
import java.util.Map;

public record SheetTabDto(
    String name,
    List<List<String>> rows,
    Map<String, SheetCellStyleDto> cellStyles
) {
    public SheetTabDto(String name, List<List<String>> rows) {
        this(name, rows, Map.of());
    }
}
