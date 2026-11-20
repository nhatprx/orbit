package com.orbit.workspace.repository;

import com.orbit.workspace.entity.ModuleEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ModuleRepository extends JpaRepository<ModuleEntity, String> {

    List<ModuleEntity> findAllByOrderBySortOrderAsc();
}
