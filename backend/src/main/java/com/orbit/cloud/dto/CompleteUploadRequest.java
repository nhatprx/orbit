package com.orbit.cloud.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CompleteUploadRequest(
    @Valid
    List<CompletedPartDto> parts,
    @Size(max = 128, message = "Checksum must be at most 128 characters.")
    String checksumSha256
) {

    public record CompletedPartDto(
        @Min(value = 1, message = "Part number must be >= 1.")
        int partNumber,
        @NotBlank(message = "Part ETag is required.")
        @JsonAlias("etag")
        String eTag
    ) {}
}
