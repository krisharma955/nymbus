package com.graviton.nymbus.user.service;

import com.graviton.nymbus.user.entity.User;
import com.graviton.nymbus.user.entity.UserRole;
import com.graviton.nymbus.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserRepository userRepository;

    /**
     * Resolves the current user. In Phase 1 development mode, ensures a default
     * user exists and returns it for all operations.
     */
    @Transactional
    public User getCurrentUser() {
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
}
