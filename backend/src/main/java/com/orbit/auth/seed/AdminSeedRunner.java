package com.orbit.auth.seed;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "orbit.seed-admin", name = "enabled", havingValue = "true")
public class AdminSeedRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeedRunner.class);

    private final AdminSeedProperties properties;
    private final AdminSeedService adminSeedService;

    public AdminSeedRunner(AdminSeedProperties properties, AdminSeedService adminSeedService) {
        this.properties = properties;
        this.adminSeedService = adminSeedService;
    }

    @Override
    public void run(String... args) {
        log.info("Executing Orbit admin seed runner for email={}", properties.getEmail());
        adminSeedService.seedAdmin(
            properties.getEmail(),
            properties.getPassword(),
            properties.getDisplayName()
        );
    }
}
