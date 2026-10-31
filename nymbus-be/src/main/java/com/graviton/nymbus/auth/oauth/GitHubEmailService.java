package com.graviton.nymbus.auth.oauth;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
public class GitHubEmailService {

    private final RestClient restClient;

    public GitHubEmailService() {
        this.restClient = RestClient.builder()
                .baseUrl("https://api.github.com")
                .defaultHeader(HttpHeaders.ACCEPT, "application/vnd.github.v3+json")
                .build();
    }

    public Optional<String> fetchPrimaryEmail(String accessToken) {
        try {
            List<GitHubEmailDto> emails = restClient.get()
                    .uri("/user/emails")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<GitHubEmailDto>>() {});

            if (emails == null || emails.isEmpty()) {
                return Optional.empty();
            }

            return emails.stream()
                    .filter(e -> Boolean.TRUE.equals(e.getPrimary()) && Boolean.TRUE.equals(e.getVerified()))
                    .map(GitHubEmailDto::getEmail)
                    .findFirst()
                    .or(() -> emails.stream()
                            .filter(e -> Boolean.TRUE.equals(e.getVerified()))
                            .map(GitHubEmailDto::getEmail)
                            .findFirst())
                    .or(() -> Optional.ofNullable(emails.get(0).getEmail()));
        } catch (Exception e) {
            log.warn("Failed to fetch GitHub emails: {}", e.getMessage());
            return Optional.empty();
        }
    }

    @Getter
    @Setter
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GitHubEmailDto {
        private String email;
        private Boolean primary;
        private Boolean verified;
        private String visibility;
    }
}
