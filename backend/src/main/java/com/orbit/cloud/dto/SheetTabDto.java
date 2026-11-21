package com.orbit.cloud.dto;

import java.util.List;

public record SheetTabDto(String name, List<List<String>> rows) {}
