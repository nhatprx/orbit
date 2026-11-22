package com.orbit.config;

import com.orbit.auth.security.GitAwareOAuth2AuthorizationRequestResolver;
import com.orbit.auth.security.JwtAuthenticationFilter;
import com.orbit.auth.security.OAuth2FailureHandler;
import com.orbit.auth.security.OAuth2SuccessHandler;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final OAuth2SuccessHandler oauth2SuccessHandler;
    private final OAuth2FailureHandler oauth2FailureHandler;
    private final ObjectProvider<ClientRegistrationRepository> clientRegistrations;

    public SecurityConfig(
        JwtAuthenticationFilter jwtAuthenticationFilter,
        OAuth2SuccessHandler oauth2SuccessHandler,
        OAuth2FailureHandler oauth2FailureHandler,
        ObjectProvider<ClientRegistrationRepository> clientRegistrations
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.oauth2SuccessHandler = oauth2SuccessHandler;
        this.oauth2FailureHandler = oauth2FailureHandler;
        this.clientRegistrations = clientRegistrations;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        ClientRegistrationRepository registrations = clientRegistrations.getIfAvailable();
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/invitations/*").permitAll()
                .requestMatchers("/ws/**").permitAll()
                .requestMatchers(
                    "/api/v1/health",
                    "/api/v1/auth/register",
                    "/api/v1/auth/login",
                    "/api/v1/auth/login/2fa",
                    "/api/v1/auth/oauth/exchange",
                    "/api/v1/auth/oauth/link/**",
                    "/api/v1/git/oauth/authorize",
                    "/api/v1/auth/forgot-password",
                    "/api/v1/auth/reset-password",
                    "/oauth2/**",
                    "/login/oauth2/**",
                    "/actuator/health/**",
                    "/v3/api-docs/**",
                    "/swagger-ui/**",
                    "/swagger-ui.html"
                ).permitAll()
                .anyRequest().authenticated()
            )
            .exceptionHandling(ex -> ex.authenticationEntryPoint((req, res, authEx) -> {
                res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                res.setContentType(MediaType.APPLICATION_JSON_VALUE);
                res.getWriter().write("{\"code\":\"UNAUTHORIZED\",\"message\":\"Authentication required.\"}");
            }))
            .oauth2Login(oauth2 -> {
                if (registrations != null) {
                    oauth2.authorizationEndpoint(ep -> ep
                        .authorizationRequestResolver(new GitAwareOAuth2AuthorizationRequestResolver(registrations)));
                }
                oauth2.successHandler(oauth2SuccessHandler).failureHandler(oauth2FailureHandler);
            })
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
