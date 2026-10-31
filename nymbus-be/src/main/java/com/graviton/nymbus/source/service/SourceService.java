package com.graviton.nymbus.source.service;

import com.graviton.nymbus.research.entity.ResearchTask;
import com.graviton.nymbus.research.repository.ResearchTaskRepository;
import com.graviton.nymbus.source.entity.Source;
import com.graviton.nymbus.source.entity.SourceType;
import com.graviton.nymbus.source.repository.SourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SourceService {

    private final SourceRepository sourceRepository;
    private final ResearchTaskRepository researchTaskRepository;
    private final CanonicalUrlService canonicalUrlService;

    @Transactional(readOnly = true)
    public java.util.List<Source> getSourcesForTask(UUID researchTaskId) {
        return sourceRepository.findByResearchTaskIdOrderByRetrievedAtAsc(researchTaskId);
    }

    @Transactional
    public Source getOrCreateSource(UUID researchTaskId, String rawUrl, String title, String rawContent, Map<String, Object> metadata) {
        ResearchTask task = researchTaskRepository.findById(researchTaskId).orElseThrow();

        String canonicalUrl = canonicalUrlService.canonicalize(rawUrl);
        String urlHash = canonicalUrlService.sha256Hex(canonicalUrl);
        String domain = canonicalUrlService.extractDomain(rawUrl);
        String cleanedText = cleanText(rawContent);
        SourceType sourceType = determineSourceType(rawUrl, domain);

        if (urlHash != null) {
            Optional<Source> existing = sourceRepository.findByResearchTaskIdAndCanonicalUrlHash(researchTaskId, urlHash);
            if (existing.isPresent()) {
                Source source = existing.get();
                // If existing has shorter text, enrich it
                if (cleanedText != null && (source.getCleanedText() == null || cleanedText.length() > source.getCleanedText().length())) {
                    source.setCleanedText(cleanedText);
                    sourceRepository.save(source);
                }
                return source;
            }
        }

        Source newSource = Source.builder()
                .researchTask(task)
                .url(rawUrl)
                .canonicalUrlHash(urlHash)
                .title(title != null && !title.isBlank() ? title : domain)
                .domain(domain)
                .sourceType(sourceType)
                .cleanedText(cleanedText)
                .rawMetadata(metadata)
                .build();

        Source saved = sourceRepository.save(newSource);
        log.info("Saved new source {} [{}] for task {}", saved.getId(), domain, researchTaskId);
        return saved;
    }

    public String cleanText(String raw) {
        if (raw == null) {
            return "";
        }
        // Strip HTML tags if any, normalize multiple spaces and newlines
        String cleaned = raw.replaceAll("<[^>]*>", " ");
        cleaned = cleaned.replaceAll("\\s+", " ").trim();
        return cleaned;
    }

    private SourceType determineSourceType(String url, String domain) {
        if (url == null) return SourceType.OTHER;
        String lowerUrl = url.toLowerCase();
        String lowerDomain = domain.toLowerCase();

        if (lowerDomain.endsWith(".gov") || lowerDomain.endsWith(".gov.in") || lowerDomain.endsWith(".gov.uk")) {
            return SourceType.GOVERNMENT;
        }
        if (lowerUrl.contains("arxiv.org") || lowerUrl.contains(".pdf") || lowerUrl.contains("doi.org") || lowerUrl.contains("nature.com") || lowerUrl.contains("ieee.org")) {
            return SourceType.RESEARCH_PAPER;
        }
        if (lowerDomain.contains("reuters") || lowerDomain.contains("bloomberg") || lowerDomain.contains("bbc") || lowerDomain.contains("techcrunch") || lowerDomain.contains("news")) {
            return SourceType.NEWS;
        }
        if (lowerUrl.contains("report") || lowerUrl.contains("gartner") || lowerUrl.contains("mckinsey") || lowerUrl.contains("rand.org")) {
            return SourceType.INDUSTRY_REPORT;
        }
        return SourceType.WEBSITE;
    }
}
