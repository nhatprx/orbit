package com.orbit.auth.security;

import com.orbit.auth.service.JwtService;
import com.orbit.auth.service.JwtService.VerifiedToken;
import com.orbit.auth.service.RedisSessionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final RedisSessionService redisSessionService;

    public JwtAuthenticationFilter(
        JwtService jwtService,
        RedisSessionService redisSessionService
    ) {
        this.jwtService = jwtService;
        this.redisSessionService = redisSessionService;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7).trim();
            try {
                VerifiedToken verified = jwtService.verify(token);
                if (redisSessionService.isSessionActive(verified.jti())) {
                    AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(
                        verified.userId(),
                        verified.jti(),
                        verified.role(),
                        verified.workspaceId()
                    );
                    var authorities = List.of(
                        new SimpleGrantedAuthority("ROLE_" + verified.role().toUpperCase())
                    );
                    var auth = new UsernamePasswordAuthenticationToken(principal, null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            } catch (Exception ignored) {
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }
}
