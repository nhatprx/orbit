package com.orbit.common;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/** Bounded pagination: page >= 0, size clamped to [1, 100]. */
public final class PageParams {

    public static final int DEFAULT_SIZE = 25;
    public static final int MAX_SIZE = 100;

    private PageParams() {}

    public static int clampSize(int size) {
        return Math.max(1, Math.min(size, MAX_SIZE));
    }

    public static Pageable of(int page, int size) {
        return PageRequest.of(Math.max(page, 0), clampSize(size));
    }

    public static Pageable of(int page, int size, Sort sort) {
        return PageRequest.of(Math.max(page, 0), clampSize(size), sort);
    }
}
