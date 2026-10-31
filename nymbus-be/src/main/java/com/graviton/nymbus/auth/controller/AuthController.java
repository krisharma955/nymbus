package com.graviton.nymbus.auth.controller;

import com.graviton.nymbus.auth.dto.UserMeResponse;
import com.graviton.nymbus.user.entity.User;
import com.graviton.nymbus.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AuthController {

    private final CurrentUserService currentUserService;

    @GetMapping("/me")
    public ResponseEntity<UserMeResponse> getCurrentUser() {
        User user = currentUserService.getCurrentUser();
        return ResponseEntity.ok(new UserMeResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.isEmailVerified(),
                user.getAvatarUrl(),
                user.getRole()
        ));
    }
}
