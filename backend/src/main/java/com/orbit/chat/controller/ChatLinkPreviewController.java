package com.orbit.chat.controller;

import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.chat.dto.LinkPreviewDto;
import com.orbit.chat.service.LinkPreviewService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatLinkPreviewController {

    private final LinkPreviewService linkPreviews;

    public ChatLinkPreviewController(LinkPreviewService linkPreviews) {
        this.linkPreviews = linkPreviews;
    }

    @GetMapping("/link-preview")
    public LinkPreviewDto preview(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @RequestParam String url
    ) {
        return linkPreviews.fetch(url);
    }
}
