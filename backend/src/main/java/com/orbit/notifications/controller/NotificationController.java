package com.orbit.notifications.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.notifications.dto.NotificationInboxResponse;
import com.orbit.notifications.service.NotificationService;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService notifications;

    public NotificationController(NotificationService notifications) { this.notifications = notifications; }

    @GetMapping
    public NotificationInboxResponse list(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return notifications.list(principal.userId(), page, size);
    }

    @PutMapping("/{notificationId}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void read(@AuthenticationPrincipal AuthenticatedUserPrincipal principal, @PathVariable UUID notificationId) {
        notifications.markRead(principal.userId(), notificationId);
    }

    @PutMapping("/read-all")
    public int readAll(@AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return notifications.markAllRead(principal.userId());
    }
}
