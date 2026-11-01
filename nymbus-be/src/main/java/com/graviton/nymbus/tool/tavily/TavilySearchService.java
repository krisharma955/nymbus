package com.graviton.nymbus.tool.tavily;

import com.graviton.nymbus.tool.WebSearchTool;
import com.graviton.nymbus.tool.model.SearchResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.util.*;

@Slf4j
@Service
public class TavilySearchService implements WebSearchTool {

    private static final int MAX_RESULTS_LIMIT = 20;

    private final RestClient restClient;

    @Value("${nymbus.tools.tavily.api-key}")
    private final String apiKey;

    public TavilySearchService(
            RestClient.Builder restClientBuilder,
            @Value("${nymbus.tools.tavily.api-key}") String apiKey,
            @Value("${nymbus.tools.tavily.base-url:https://api.tavily.com}") String baseUrl
    ) {
        if (!StringUtils.hasText(apiKey)) {
            throw new IllegalStateException("Tavily API key is not configured.");
        }

        this.apiKey = apiKey.trim();

        this.restClient = restClientBuilder
                .baseUrl(baseUrl)
                .build();
    }

    @Override
    public List<SearchResult> search(String query, int maxResults) {
        if (!StringUtils.hasText(query)) {
            log.debug("Empty query passed to Tavily search; returning empty results without error.");
            return Collections.emptyList();
        }

        int limit = Math.max(1, Math.min(maxResults, MAX_RESULTS_LIMIT));

        Map<String, Object> requestBody = Map.of(
                "query", query.trim(),
                "search_depth", "basic",
                "max_results", limit
        );

        try {

            TavilyResponse response = restClient.post()
                    .uri("/search")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + apiKey)
                    .body(requestBody)
                    .retrieve()
                    .body(TavilyResponse.class);

            if (response == null || response.results() == null) {
                throw new IllegalStateException(
                        "Tavily returned an invalid or empty response."
                );
            }

            List<SearchResult> results = response.results()
                    .stream()
                    .filter(this::isValidResult)
                    .map(result -> new SearchResult(
                            result.title().trim(),
                            result.url().trim(),
                            result.content().trim(),
                            result.score()
                    ))
                    .filter(result -> result.url() != null)
                    .collect(java.util.stream.Collectors.collectingAndThen(
                            java.util.stream.Collectors.toMap(
                                    result -> result.url().toLowerCase(Locale.ROOT),
                                    result -> result,
                                    (first, second) -> first
                            ),
                            map -> List.copyOf(map.values())
                    ));

            log.info(
                    "Tavily returned {} valid sources for query: {}",
                    results.size(),
                    query
            );

            return results;

        } catch (Exception ex) {

            log.error(
                    "Tavily API request failed for query '{}': {}",
                    query,
                    ex.getMessage()
            );

            throw new IllegalStateException(
                    "Unable to retrieve research sources from Tavily.",
                    ex
            );
        }
    }

    private boolean isValidResult(TavilyResultItem result) {

        if (result == null
                || !StringUtils.hasText(result.title())
                || !StringUtils.hasText(result.url())
                || !StringUtils.hasText(result.content())) {
            return false;
        }

        try {
            URI uri = URI.create(result.url().trim());

            return uri.isAbsolute()
                    && uri.getHost() != null
                    && Set.of("http", "https")
                    .contains(uri.getScheme().toLowerCase(Locale.ROOT));

        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    public record TavilyResponse(List<TavilyResultItem> results) {}
    public record TavilyResultItem(String title, String url, String content, Double score) {}
}
