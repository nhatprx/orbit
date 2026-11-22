package com.orbit.auth.service;

import com.orbit.auth.entity.UserEntity;
import com.orbit.common.ApiException;

/** Refuses to start a session for an account an administrator has disabled. */
public final class AccountStatusGuard {

    public static final String ACCOUNT_DISABLED = "ACCOUNT_DISABLED";

    private AccountStatusGuard() {}

    public static void requireActive(UserEntity user) {
        if (user.isDisabled()) {
            throw ApiException.forbidden(
                ACCOUNT_DISABLED, "This account has been disabled. Contact an administrator."
            );
        }
    }
}
