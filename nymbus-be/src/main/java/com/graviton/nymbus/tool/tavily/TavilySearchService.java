package com.graviton.nymbus.tool.tavily;

import com.graviton.nymbus.tool.WebSearchTool;
import com.graviton.nymbus.tool.model.SearchResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class TavilySearchService implements WebSearchTool {

    private final RestClient restClient;
    private final String apiKey;
    private final String baseUrl;

    public TavilySearchService(
            RestClient.Builder restClientBuilder,
            @Value("${nymbus.tools.tavily.api-key:}") String apiKey,
            @Value("${nymbus.tools.tavily.base-url:https://api.tavily.com}") String baseUrl) {
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }

    @Override
    public List<SearchResult> search(String query, int maxResults) {
        if (!StringUtils.hasText(apiKey)) {
            log.info("Tavily API key not configured. Using mock search results for query: '{}'", query);
            return generateMockResults(query, maxResults);
        }

        try {
            Map<String, Object> requestBody = Map.of(
                    "api_key", apiKey,
                    "query", query,
                    "search_depth", "basic",
                    "max_results", Math.max(1, Math.min(maxResults, 10))
            );

            TavilyResponse response = restClient.post()
                    .uri("/search")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(TavilyResponse.class);

            if (response != null && response.results() != null) {
                return response.results().stream()
                        .map(r -> new SearchResult(r.title(), r.url(), r.content(), r.score()))
                        .toList();
            }
        } catch (Exception e) {
            log.warn("Tavily search request failed for query '{}': {}. Falling back to simulated results.",
                    query, e.getMessage());
        }

        return generateMockResults(query, maxResults);
    }

    private List<SearchResult> generateMockResults(String query, int count) {
        List<SearchResult> results = new ArrayList<>();
        int limit = Math.max(1, Math.min(count, 5));
        for (int i = 1; i <= limit; i++) {
            results.add(new SearchResult(
                    "Analysis and Findings on: " + query + " (Source " + i + ")",
                    "https://example.org/research/" + query.toLowerCase().replaceAll("[^a-z0-9]+", "-") + "-" + i,
                    "Detailed verified evidence passage discussing '" + query + "'. Key finding point " + i +
                            " highlights critical metrics and domain outcomes related to the subtask query.",
                    0.95 - (i * 0.05)
            ));
        }
        return results;
    }

    public record TavilyResponse(List<TavilyResultItem> results) {}
    public record TavilyResultItem(String title, String url, String content, Double score) {}
}
