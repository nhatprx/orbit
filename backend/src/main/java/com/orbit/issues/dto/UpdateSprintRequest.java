package com.orbit.issues.dto;

import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record UpdateSprintRequest(
    @Size(max = 120, message = "Sprint name must be at most 120 characters.")
    String name,
    @Size(max = 500, message = "Sprint goal must be at most 500 characters.")
    String goal,
    String status,
    LocalDate startDate,
    LocalDate endDate,
    Boolean moveIncompleteToBacklog
) {}
