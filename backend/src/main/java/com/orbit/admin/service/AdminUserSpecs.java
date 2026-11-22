package com.orbit.admin.service;

import com.orbit.admin.dto.UserStatus;
import com.orbit.auth.entity.UserEntity;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

/** Optional filters for the user table; a predicate exists only when its filter is present. */
final class AdminUserSpecs {

    private AdminUserSpecs() {}

    static Specification<UserEntity> matching(String text, String role, UserStatus status) {
        return (root, query, cb) -> {
            List<Predicate> all = new ArrayList<>();
            if (text != null) {
                String pattern = "%" + escapeLike(text.toLowerCase(Locale.ROOT)) + "%";
                all.add(cb.or(
                    cb.like(cb.lower(root.<String>get("username")), pattern, '\\'),
                    cb.like(cb.lower(root.<String>get("email")), pattern, '\\'),
                    cb.like(cb.lower(root.<String>get("displayName")), pattern, '\\')
                ));
            }
            if (role != null) {
                all.add(cb.equal(cb.lower(root.<String>get("role")), role));
            }
            if (status != null) {
                Expression<?> disabledAt = root.get("accountStatus").get("disabledAt");
                all.add(status == UserStatus.DISABLED ? cb.isNotNull(disabledAt) : cb.isNull(disabledAt));
            }
            return cb.and(all.toArray(Predicate[]::new));
        };
    }

    /** Makes %, _ and the escape character match literally inside a LIKE pattern. */
    static String escapeLike(String raw) {
        return raw.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
