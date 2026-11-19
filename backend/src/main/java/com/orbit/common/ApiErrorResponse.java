package com.orbit.common;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ApiErrorResponse(
    String code,
    String message,
    String traceId,
    Instant timestamp,
    List<FieldErrorDetail> details
) {

    public record FieldErrorDetail(String field, String reason) {}

    public static ApiErrorResponse of(String code, String message) {
        return new ApiErrorResponse(code, message, UUID.randomUUID().toString(), Instant.now(), List.of());
    }

    public static ApiErrorResponse of(String code, String message, List<FieldErrorDetail> details) {
        return new ApiErrorResponse(code, message, UUID.randomUUID().toString(), Instant.now(), details);
    }
}
