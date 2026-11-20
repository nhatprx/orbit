package com.orbit.cloud.dto;

import java.time.Instant;
import java.util.List;

public record SignPartsResponse(List<SignedPart> parts, Instant expiresAt) {

    public record SignedPart(int partNumber, String uploadUrl) {}
}
