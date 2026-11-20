package com.orbit.auth.controller;

import com.orbit.auth.dto.AuthUserDto;
import com.orbit.auth.dto.AvatarPresignRequest;
import com.orbit.auth.dto.AvatarPresignResponse;
import com.orbit.auth.dto.UpdateAvatarRequest;
import com.orbit.auth.security.AuthenticatedUserPrincipal;
import com.orbit.auth.service.ProfileAvatarService;
import com.orbit.common.ApiException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/profile/avatar")
@Tag(name = "Profile Avatar", description = "AWS S3 backed user profile avatar endpoints")
public class ProfileAvatarController {

    private final ProfileAvatarService profileAvatarService;

    public ProfileAvatarController(ProfileAvatarService profileAvatarService) {
        this.profileAvatarService = profileAvatarService;
    }

    @PostMapping("/presign")
    @Operation(summary = "Create a presigned AWS S3 PUT URL for uploading a profile avatar")
    public ResponseEntity<AvatarPresignResponse> presignAvatarUpload(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody AvatarPresignRequest request
    ) {
        return ResponseEntity.ok(profileAvatarService.createUploadUrl(requireUser(principal), request));
    }

    @PutMapping
    @Operation(summary = "Confirm and persist the uploaded S3 avatar key for the authenticated user")
    public ResponseEntity<AuthUserDto> confirmAvatar(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
        @Valid @RequestBody UpdateAvatarRequest request
    ) {
        return ResponseEntity.ok(profileAvatarService.confirmAvatar(requireUser(principal), request.key()));
    }

    @DeleteMapping
    @Operation(summary = "Remove the authenticated user's profile avatar")
    public ResponseEntity<AuthUserDto> removeAvatar(
        @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        return ResponseEntity.ok(profileAvatarService.removeAvatar(requireUser(principal)));
    }

    private UUID requireUser(AuthenticatedUserPrincipal principal) {
        if (principal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required.");
        }
        return principal.userId();
    }
}
