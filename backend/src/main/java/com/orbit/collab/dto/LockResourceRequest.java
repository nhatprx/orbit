package com.orbit.collab.dto;

import jakarta.validation.constraints.NotNull;

public record LockResourceRequest(@NotNull Boolean locked) {}
