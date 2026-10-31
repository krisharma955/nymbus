package com.graviton.nymbus.auth.oauth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.graviton.nymbus.auth.config.AuthProperties;
import com.graviton.nymbus.auth.jwt.JwtService;
import com.graviton.nymbus.user.entity.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final JwtService jwtService;
    private final AuthProperties authProperties;
    private final ObjectMapper objectMapper;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException {
        User user = null;
        Object principal = authentication.getPrincipal();

        if (principal instanceof NymbusOAuth2User nymbusOAuth2User) {
            user = nymbusOAuth2User.getUser();
        } else if (principal instanceof NymbusOidcUser nymbusOidcUser) {
            user = nymbusOidcUser.getUser();
        }

        if (user == null) {
            log.error("Unable to resolve Nymbus user from principal: {}", principal);
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Failed to resolve authenticated user");
            return;
        }

        String token = jwtService.generateToken(user);

        String acceptHeader = request.getHeader("Accept");
        if (acceptHeader != null && acceptHeader.contains(MediaType.APPLICATION_JSON_VALUE)) {
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setStatus(HttpServletResponse.SC_OK);

            Map<String, Object> body = new HashMap<>();
            body.put("token", token);
            Map<String, Object> userMap = new HashMap<>();
            userMap.put("id", user.getId().toString());
            userMap.put("name", user.getName());
            userMap.put("email", user.getEmail());
            userMap.put("avatarUrl", user.getAvatarUrl());
            userMap.put("role", user.getRole().name());
            body.put("user", userMap);

            objectMapper.writeValue(response.getWriter(), body);
        } else {
            String baseUrl = authProperties.getFrontendSuccessUrl();
            String redirectUrl = baseUrl + (baseUrl.contains("#") ? "&token=" : "#token=")
                    + URLEncoder.encode(token, StandardCharsets.UTF_8);
            response.sendRedirect(redirectUrl);
        }
    }
}
