package com.orbit.notifications.dto;

import com.orbit.common.PageResponse;

public record NotificationInboxResponse(PageResponse<NotificationDto> page, long unreadCount) {}
