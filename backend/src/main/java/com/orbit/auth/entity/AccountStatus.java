package com.orbit.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.time.Instant;
import java.util.UUID;

/** Admin-controlled account state. A null disabledAt means the account is active. */
@Embeddable
public class AccountStatus {

    @Column(name = "disabled_at")
    private Instant disabledAt;

    @Column(name = "disabled_reason", length = 255)
    private String disabledReason;

    @Column(name = "disabled_by")
    private UUID disabledBy;

    public boolean isDisabled() {
        return disabledAt != null;
    }

    public Instant getDisabledAt() { return disabledAt; }

    public String getDisabledReason() { return disabledReason; }

    public UUID getDisabledBy() { return disabledBy; }

    public void disable(UUID byUserId, String reason, Instant at) {
        this.disabledAt = at;
        this.disabledBy = byUserId;
        this.disabledReason = reason;
    }

    public void enable() {
        this.disabledAt = null;
        this.disabledBy = null;
        this.disabledReason = null;
    }
}
