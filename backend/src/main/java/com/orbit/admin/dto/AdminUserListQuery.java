package com.orbit.admin.dto;

/** Raw list filters as received over HTTP; the query service validates every field. */
public record AdminUserListQuery(String q, String role, String status, String sort, int page, int size) {}
