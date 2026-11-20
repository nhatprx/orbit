package com.orbit.auth.service;

import com.orbit.auth.dto.UserActivitySummaryDto;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.UserRepository;
import com.orbit.chat.repository.ChatMessageRepository;
import com.orbit.common.ApiException;
import com.orbit.project.repository.ProjectRepository;
import com.orbit.workspace.repository.WorkspaceMemberRepository;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserActivitySummaryService {

    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final ProjectRepository projectRepository;
    private final ChatMessageRepository chatMessageRepository;

    public UserActivitySummaryService(
        UserRepository userRepository,
        WorkspaceMemberRepository workspaceMemberRepository,
        ProjectRepository projectRepository,
        ChatMessageRepository chatMessageRepository
    ) {
        this.userRepository = userRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.projectRepository = projectRepository;
        this.chatMessageRepository = chatMessageRepository;
    }

    @Transactional(readOnly = true)
    public UserActivitySummaryDto getSummary(UUID userId) {
        UserEntity user = userRepository.findById(userId).orElseThrow(() ->
            new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found.")
        );

        long workspaceCount = workspaceMemberRepository.countActiveWorkspacesByUserId(userId);
        long projectCount = projectRepository.findVisibleAcrossWorkspaces(userId, PageRequest.of(0, 1))
            .getTotalElements();

        Instant since = Instant.now().minus(30, ChronoUnit.DAYS);
        long messagesTotal = chatMessageRepository.countBySenderId(userId);
        List<Instant> recentTimestamps = chatMessageRepository.findCreatedAtBySenderIdSince(userId, since);
        long messagesLast30Days = recentTimestamps.size();
        int activeDays = (int) recentTimestamps.stream()
            .map(ts -> ts.atZone(ZoneOffset.UTC).toLocalDate())
            .distinct()
            .count();

        Instant latestMessage = chatMessageRepository.findLatestCreatedAtBySenderId(userId);
        Instant lastActive = latestMessage != null ? latestMessage : user.getUpdatedAt();

        return new UserActivitySummaryDto(
            workspaceCount,
            projectCount,
            messagesTotal,
            messagesLast30Days,
            activeDays,
            lastActive != null ? lastActive.toString() : null
        );
    }
}
