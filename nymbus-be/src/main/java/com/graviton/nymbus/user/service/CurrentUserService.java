package com.graviton.nymbus.user.service;

import com.graviton.nymbus.auth.config.AuthProperties;
import com.graviton.nymbus.user.entity.User;
import com.graviton.nymbus.user.entity.UserRole;
import com.graviton.nymbus.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserRepository userRepository;
    private final AuthProperties authProperties;

    @Transactional
    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            String subject = jwtAuth.getToken().getSubject();
            if (subject != null && !subject.isBlank()) {
                try {
                    UUID userId = UUID.fromString(subject);
                    return userRepository.findById(userId)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid UUID in JWT subject: {}", subject);
                    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid user identifier in token");
                }
            }
        }

        if (authProperties.isDevFallback()) {
            return userRepository.findByEmailIgnoreCase("developer@nymbus.ai")
                    .orElseGet(() -> {
                        log.info("Initializing default development user: developer@nymbus.ai");
                        User user = User.builder()
                                .name("Developer User")
                                .email("developer@nymbus.ai")
                                .emailVerified(true)
                                .role(UserRole.USER)
                                .build();
                        return userRepository.save(user);
                    });
        }

        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
    }
}
