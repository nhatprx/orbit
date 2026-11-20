package com.orbit.workspace.dto;

import java.util.List;

public record EffectiveModulesDto(String scope, List<ModuleCatalogItemDto> modules) {}
