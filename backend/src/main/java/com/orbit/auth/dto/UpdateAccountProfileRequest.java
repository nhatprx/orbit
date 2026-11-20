package com.orbit.auth.dto;

import jakarta.validation.constraints.Size;
import java.util.List;

public record UpdateAccountProfileRequest(
    @Size(max = 50, message = "Username must be at most 50 characters.")
    String username,

    @Size(max = 100, message = "Display name must be at most 100 characters.")
    String displayName,

    @Size(max = 300, message = "Bio must be at most 300 characters.")
    String bio,

    @Size(max = 2000, message = "Introduction must be at most 2000 characters.")
    String introduction,

    @Size(max = 120, message = "Organization must be at most 120 characters.")
    String organization,

    @Size(max = 120, message = "Location must be at most 120 characters.")
    String location,

    @Size(max = 255, message = "Website must be at most 255 characters.")
    String website,

    Boolean activeStatusEnabled,

    @Size(max = 16, message = "Active status must be at most 16 characters.")
    String activeStatus,

    @Size(max = 6, message = "You can pin at most 6 projects.")
    List<String> pinnedProjectIds
) {

    public UpdateAccountProfileRequest(String username, String displayName) {
        this(username, displayName, null, null, null, null, null, null, null, null);
    }
}
