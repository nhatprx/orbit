package com.orbit.auth.seed;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.orbit.OrbitApplication;
import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.repository.OAuthAccountRepository;
import com.orbit.auth.repository.UserRepository;
import com.orbit.config.SecurityConfig;
import com.orbit.config.WebCorsConfig;
import com.orbit.support.MockRepositoriesRegistrar;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootTest(
    classes = OrbitApplication.class,
    webEnvironment = SpringBootTest.WebEnvironment.NONE,
    properties = {
        "spring.main.web-application-type=none",
        "orbit.seed-admin.enabled=true",
        "orbit.seed-admin.email=cli-admin@orbit.dev",
        "orbit.seed-admin.password=CliAdmin!2026",
        "orbit.seed-admin.display-name=CLI Orbit Admin",
        "spring.autoconfigure.exclude="
            + "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,"
            + "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,"
            + "org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration,"
            + "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration,"
            + "org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,"
            + "org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration"
    }
)
@Import(AdminSeedCliContextTest.CliMockBeansConfig.class)
class AdminSeedCliContextTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UserRepository userRepository;

    @TestConfiguration
    @Import(MockRepositoriesRegistrar.class)
    static class CliMockBeansConfig {

        @Bean
        @Primary
        UserRepository userRepository() {
            UserRepository repo = mock(UserRepository.class);
            when(repo.findByEmailIgnoreCase(any())).thenReturn(Optional.empty());
            when(repo.existsByUsernameIgnoreCase(any())).thenReturn(false);
            when(repo.save(any(UserEntity.class))).thenAnswer(inv -> {
                UserEntity user = inv.getArgument(0);
                if (user.getId() == null) {
                    user.setId(UUID.randomUUID());
                }
                return user;
            });
            return repo;
        }

        @Bean
        @Primary
        OAuthAccountRepository oAuthAccountRepository() {
            return mock(OAuthAccountRepository.class);
        }

        @Bean
        @Primary
        StringRedisTemplate stringRedisTemplate() {
            return mock(StringRedisTemplate.class);
        }
    }

    @Test
    void nonWebContextSkipsServletSecurityAndRunsAdminSeedRunner() {
        assertEquals(0, applicationContext.getBeanNamesForType(SecurityConfig.class).length);
        assertEquals(0, applicationContext.getBeanNamesForType(WebCorsConfig.class).length);
        assertNotNull(applicationContext.getBean(AdminSeedRunner.class));
        assertNotNull(passwordEncoder);

        ArgumentCaptor<UserEntity> captor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(captor.capture());

        UserEntity saved = captor.getValue();
        assertEquals("cli-admin@orbit.dev", saved.getEmail());
        assertEquals("admin", saved.getRole());
        assertEquals("CLI Orbit Admin", saved.getDisplayName());
        assertTrue(passwordEncoder.matches("CliAdmin!2026", saved.getPasswordHash()));
    }
}
