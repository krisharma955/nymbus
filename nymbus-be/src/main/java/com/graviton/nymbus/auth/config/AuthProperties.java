package com.graviton.nymbus.auth.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.Collections;
import java.util.List;

@Configuration
@ConfigurationProperties(prefix = "nymbus.auth")
@Getter
@Setter
public class AuthProperties {

    private boolean requireAuth = false;
    private boolean devFallback = true;
    private String frontendSuccessUrl = "http://localhost:3000";
    private List<String> allowedOrigins = Collections.singletonList("http://localhost:3000");
    private JwtProperties jwt = new JwtProperties();

    @Getter
    @Setter
    public static class JwtProperties {
        private String secret = "dev-only-change-me-32-bytes-minimum-secret";
        private String issuer = "nymbus";
        private long ttlSeconds = 86400;
    }
}
