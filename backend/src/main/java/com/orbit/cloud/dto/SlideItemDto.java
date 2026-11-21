package com.orbit.cloud.dto;

import java.util.List;

public record SlideItemDto(String title, String subtitle, List<String> bullets, String notes) {}
