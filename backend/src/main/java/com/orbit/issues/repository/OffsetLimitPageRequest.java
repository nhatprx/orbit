package com.orbit.issues.repository;

import com.orbit.common.ApiException;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/** Bounded offset/limit Pageable for issues queries (default limit 200, max 500). */
public final class OffsetLimitPageRequest implements Pageable {

    public static final int DEFAULT_LIMIT = 200;
    public static final int MAX_LIMIT = 500;

    private final long offset;
    private final int limit;
    private final Sort sort;

    private OffsetLimitPageRequest(long offset, int limit, Sort sort) {
        this.offset = offset;
        this.limit = limit;
        this.sort = sort == null ? Sort.unsorted() : sort;
    }

    public static OffsetLimitPageRequest of(Integer rawOffset, Integer rawLimit, Sort sort) {
        int resolvedOffset = rawOffset == null ? 0 : rawOffset;
        if (resolvedOffset < 0) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Offset must be non-negative.");
        }
        int resolvedLimit = rawLimit == null ? DEFAULT_LIMIT : rawLimit;
        if (resolvedLimit < 1) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Limit must be at least 1.");
        }
        int boundedLimit = Math.min(resolvedLimit, MAX_LIMIT);
        return new OffsetLimitPageRequest(resolvedOffset, boundedLimit, sort);
    }

    @Override
    public int getPageNumber() {
        return (int) (offset / limit);
    }

    @Override
    public int getPageSize() {
        return limit;
    }

    @Override
    public long getOffset() {
        return offset;
    }

    @Override
    public Sort getSort() {
        return sort;
    }

    @Override
    public Pageable next() {
        return new OffsetLimitPageRequest(offset + limit, limit, sort);
    }

    @Override
    public Pageable previousOrFirst() {
        return new OffsetLimitPageRequest(Math.max(0L, offset - limit), limit, sort);
    }

    @Override
    public Pageable first() {
        return new OffsetLimitPageRequest(0L, limit, sort);
    }

    @Override
    public Pageable withPage(int pageNumber) {
        return new OffsetLimitPageRequest(Math.max(0L, (long) pageNumber * limit), limit, sort);
    }

    @Override
    public boolean hasPrevious() {
        return offset > 0;
    }
}
