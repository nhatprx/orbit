package com.orbit.cloud.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record SignPartsRequest(
    @NotEmpty(message = "At least one part number is required.")
    @Size(max = 100, message = "At most 100 part numbers may be signed at once.")
    List<Integer> partNumbers
) {}
