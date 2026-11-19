package com.orbit.auth.security;

import com.orbit.auth.entity.UserEntity;
import com.orbit.auth.service.OAuthUserProvisioningService;
import com.orbit.auth.service.RedisSessionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final OAuthUserProvisioningService provisioningService;
    private final RedisSessionService redisSessionService;
    private final String frontendUrl;

    public OAuth2SuccessHandler(
        OAuthUserProvisioningService provisioningService,
        RedisSessionService redisSessionService,
        @Value("${orbit.frontend.url:http://localhost:5173}") String frontendUrl
    ) {
        this.provisioningService = provisioningService;
        this.redisSessionService = redisSessionService;
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void onAuthenticationSuccess(
        HttpServletRequest request,
        HttpServletResponse response,
        Authentication authentication
    ) throws IOException {
        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        String provider = oauthToken.getAuthorizedClientRegistrationId();
        OAuth2User oauth2User = oauthToken.getPrincipal();

        UserEntity user = provisioningService.provisionOAuthUser(provider, oauth2User);
        String exchangeCode = redisSessionService.createOAuthExchangeCode(user.getId());

        String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl)
            .queryParam("oauth_code", exchangeCode)
            .build()
            .toUriString();

        response.sendRedirect(targetUrl);
    }
}
