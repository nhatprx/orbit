package com.orbit.cloud.dto;

import java.util.List;

public record OfficeDocContentDto(List<DocBlockDto> blocks, List<DocTableDto> tables) {}
