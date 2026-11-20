package com.orbit.workspace.service;

import com.orbit.common.ApiException;
import com.orbit.workspace.dto.ModuleCatalogItemDto;
import com.orbit.workspace.entity.ModuleEntity;
import com.orbit.workspace.repository.ModuleRepository;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/** Read-through cache of the static module catalog (seeded by migration, never mutated at runtime). */
@Component
public class ModuleCatalog {

    private final ModuleRepository modules;
    private volatile List<ModuleEntity> cache;

    public ModuleCatalog(ModuleRepository modules) {
        this.modules = modules;
    }

    public List<ModuleEntity> all() {
        List<ModuleEntity> snapshot = cache;
        if (snapshot == null) {
            snapshot = List.copyOf(modules.findAllByOrderBySortOrderAsc());
            cache = snapshot;
        }
        return snapshot;
    }

    public List<ModuleCatalogItemDto> items(Set<String> onlyKeys) {
        return all().stream()
            .filter(m -> onlyKeys == null || onlyKeys.contains(m.getModuleKey()))
            .map(ModuleCatalog::toItem)
            .toList();
    }

    public ModuleEntity require(String key) {
        String normalized = key == null ? "" : key.trim().toLowerCase(Locale.ROOT);
        return all().stream()
            .filter(m -> m.getModuleKey().equals(normalized))
            .findFirst()
            .orElseThrow(() -> ApiException.notFound("MODULE_NOT_FOUND", "Unknown module."));
    }

    /** Validates, de-duplicates and orders module keys by catalog order. */
    public List<String> requireValidKeys(Collection<String> keys) {
        if (keys == null || keys.isEmpty()) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Select at least one module.");
        }
        Set<String> requested = keys.stream()
            .map(k -> k.trim().toLowerCase(Locale.ROOT))
            .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<String> valid = all().stream().map(ModuleEntity::getModuleKey).collect(Collectors.toSet());
        if (!valid.containsAll(requested)) {
            throw ApiException.badRequest("VALIDATION_ERROR", "One or more modules are unknown.");
        }
        return all().stream().map(ModuleEntity::getModuleKey).filter(requested::contains).toList();
    }

    public static ModuleCatalogItemDto toItem(ModuleEntity module) {
        return new ModuleCatalogItemDto(module.getModuleKey(), module.getName(), module.getDescription());
    }
}
