package com.graviton.nymbus.report.service;

import com.graviton.nymbus.common.exception.ResourceNotFoundException;
import com.graviton.nymbus.evidence.entity.Evidence;
import com.graviton.nymbus.evidence.entity.EvidenceSource;
import com.graviton.nymbus.evidence.repository.EvidenceSourceRepository;
import com.graviton.nymbus.report.dto.*;
import com.graviton.nymbus.report.entity.ReportSection;
import com.graviton.nymbus.report.entity.ReportSectionEvidence;
import com.graviton.nymbus.report.entity.ResearchReport;
import com.graviton.nymbus.report.repository.ReportSectionEvidenceRepository;
import com.graviton.nymbus.report.repository.ReportSectionRepository;
import com.graviton.nymbus.report.repository.ResearchReportRepository;
import com.graviton.nymbus.source.entity.Source;
import com.graviton.nymbus.user.entity.User;
import com.graviton.nymbus.user.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final ResearchReportRepository researchReportRepository;
    private final ReportSectionRepository reportSectionRepository;
    private final ReportSectionEvidenceRepository reportSectionEvidenceRepository;
    private final EvidenceSourceRepository evidenceSourceRepository;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public ReportDetailResponse getReportDetail(UUID reportId) {
        ResearchReport report = getAuthorizedReport(reportId);

        List<ReportSection> sections = reportSectionRepository.findByReportIdOrderBySectionOrderAsc(reportId);
        List<ReportSectionEvidence> allEvidenceLinks = reportSectionEvidenceRepository.findByReportIdWithEvidence(reportId);

        // Group evidence links by section ID
        Map<UUID, List<ReportSectionEvidence>> sectionEvidenceMap = new HashMap<>();
        for (ReportSectionEvidence rse : allEvidenceLinks) {
            sectionEvidenceMap.computeIfAbsent(rse.getReportSection().getId(), k -> new ArrayList<>()).add(rse);
        }

        List<ReportSectionResponse> sectionResponses = new ArrayList<>();
        for (ReportSection section : sections) {
            List<ReportSectionEvidence> links = sectionEvidenceMap.getOrDefault(section.getId(), Collections.emptyList());
            List<ReportCitationResponse> citationResponses = new ArrayList<>();

            for (ReportSectionEvidence link : links) {
                Evidence ev = link.getEvidence();
                List<EvidenceSource> evSources = evidenceSourceRepository.findByEvidenceId(ev.getId());
                List<CitationSourceDto> sourceDtos = evSources.stream()
                        .map(es -> {
                            Source s = es.getSource();
                            return new CitationSourceDto(
                                    s.getId(),
                                    s.getTitle(),
                                    s.getUrl(),
                                    s.getDomain(),
                                    s.getSourceType(),
                                    es.getSourceLocator()
                            );
                        })
                        .toList();

                citationResponses.add(new ReportCitationResponse(
                        link.getId(),
                        link.getCitationLabel(),
                        ev.getId(),
                        ev.getClaim(),
                        ev.getSupportingPassage(),
                        ev.getVerificationStatus(),
                        ev.getConfidenceScore(),
                        sourceDtos
                ));
            }

            sectionResponses.add(new ReportSectionResponse(
                    section.getId(),
                    report.getId(),
                    section.getSectionKey(),
                    section.getTitle(),
                    section.getContentMarkdown(),
                    section.getSectionOrder(),
                    citationResponses,
                    section.getCreatedAt()
            ));
        }

        return new ReportDetailResponse(
                report.getId(),
                report.getResearchTask().getId(),
                report.getVersion(),
                report.getTitle(),
                report.getExecutiveSummary(),
                report.getStatus(),
                report.getContentMarkdown(),
                report.getGeneratedByExecutionId(),
                sectionResponses,
                report.getCreatedAt(),
                report.getCompletedAt()
        );
    }

    @Transactional(readOnly = true)
    public ExportPayload exportReport(UUID reportId, String format) {
        ReportDetailResponse detail = getReportDetail(reportId);
        String requestedFormat = format != null ? format.trim().toLowerCase() : "markdown";

        if ("html".equals(requestedFormat)) {
            String html = generateHtmlExport(detail);
            String filename = sanitizeFilename(detail.title()) + "-v" + detail.version() + ".html";
            return new ExportPayload(html, "text/html; charset=UTF-8", filename);
        }

        // Default: Markdown export
        String markdown = generateMarkdownExport(detail);
        String filename = sanitizeFilename(detail.title()) + "-v" + detail.version() + ".md";
        return new ExportPayload(markdown, "text/markdown; charset=UTF-8", filename);
    }

    private String generateMarkdownExport(ReportDetailResponse detail) {
        StringBuilder sb = new StringBuilder();
        sb.append("# ").append(detail.title()).append("\n\n");
        sb.append("> **Version:** ").append(detail.version())
                .append(" | **Generated:** ").append(detail.completedAt() != null ? detail.completedAt() : detail.createdAt())
                .append(" | **Status:** ").append(detail.status()).append("\n\n");

        if (detail.sections() != null && !detail.sections().isEmpty()) {
            for (ReportSectionResponse sec : detail.sections()) {
                sb.append(sec.contentMarkdown()).append("\n\n");
            }

            // Append aggregated References appendix
            sb.append("## Evidence & Citations Index\n\n");
            Map<UUID, String> citedMap = new LinkedHashMap<>();
            int index = 1;
            for (ReportSectionResponse sec : detail.sections()) {
                if (sec.citations() != null) {
                    for (ReportCitationResponse cit : sec.citations()) {
                        if (!citedMap.containsKey(cit.evidenceId())) {
                            citedMap.put(cit.evidenceId(), String.format("[%d] **%s** (Status: `%s`, Confidence: %s)\n    - Supporting Passage: _\"%s\"_\n",
                                    index++, cit.claim(), cit.verificationStatus(),
                                    cit.confidenceScore() != null ? cit.confidenceScore() : "N/A",
                                    cit.supportingPassage()));
                        }
                    }
                }
            }

            for (String citEntry : citedMap.values()) {
                sb.append(citEntry).append("\n");
            }
        } else if (detail.contentMarkdown() != null) {
            sb.append(detail.contentMarkdown()).append("\n");
        }

        return sb.toString();
    }

    private String generateHtmlExport(ReportDetailResponse detail) {
        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html>\n<html>\n<head>\n");
        sb.append("<meta charset=\"UTF-8\">\n");
        sb.append("<title>").append(escapeHtml(detail.title())).append("</title>\n");
        sb.append("<style>\n");
        sb.append("body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #1f2937; }\n");
        sb.append("h1 { color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }\n");
        sb.append("h2 { color: #1f2937; margin-top: 28px; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px; }\n");
        sb.append(".badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.85em; font-weight: 600; }\n");
        sb.append(".badge-verified { background: #def7ec; color: #03543f; }\n");
        sb.append(".citation-box { background: #f9fafb; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 12px 0; border-radius: 0 4px 4px 0; }\n");
        sb.append("blockquote { background: #f3f4f6; margin: 0; padding: 12px 16px; border-left: 4px solid #9ca3af; font-style: italic; }\n");
        sb.append("</style>\n</head>\n<body>\n");

        sb.append("<h1>").append(escapeHtml(detail.title())).append("</h1>\n");
        sb.append("<p><strong>Version:</strong> ").append(detail.version())
                .append(" | <strong>Status:</strong> <span class=\"badge badge-verified\">").append(detail.status()).append("</span></p>\n");

        if (detail.sections() != null && !detail.sections().isEmpty()) {
            for (ReportSectionResponse sec : detail.sections()) {
                sb.append("<h2>").append(escapeHtml(sec.title())).append("</h2>\n");
                sb.append("<div>").append(convertMarkdownToSimpleHtml(sec.contentMarkdown())).append("</div>\n");

                if (sec.citations() != null && !sec.citations().isEmpty()) {
                    sb.append("<div class=\"citation-box\"><strong>Cited Evidence:</strong><ul>\n");
                    for (ReportCitationResponse cit : sec.citations()) {
                        sb.append("<li><strong>").append(escapeHtml(cit.citationLabel() != null ? cit.citationLabel() : "Citation")).append(":</strong> ")
                                .append(escapeHtml(cit.claim()))
                                .append(" <span class=\"badge badge-verified\">").append(cit.verificationStatus()).append("</span></li>\n");
                    }
                    sb.append("</ul></div>\n");
                }
            }
        } else if (detail.contentMarkdown() != null) {
            sb.append("<div>").append(convertMarkdownToSimpleHtml(detail.contentMarkdown())).append("</div>\n");
        }

        sb.append("</body>\n</html>");
        return sb.toString();
    }

    private ResearchReport getAuthorizedReport(UUID reportId) {
        ResearchReport report = researchReportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found with id: " + reportId));

        User currentUser = currentUserService.getCurrentUser();
        if (report.getResearchTask() != null && report.getResearchTask().getUser() != null) {
            if (!report.getResearchTask().getUser().getId().equals(currentUser.getId())) {
                throw new ResourceNotFoundException("Report not found with id: " + reportId);
            }
        }
        return report;
    }

    private String sanitizeFilename(String title) {
        if (title == null) return "report";
        return title.replaceAll("[^a-zA-Z0-9-_]", "-").replaceAll("-+", "-").toLowerCase();
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private String convertMarkdownToSimpleHtml(String md) {
        if (md == null) return "";
        return md.replaceAll("(?m)^## (.*)$", "<h3>$1</h3>")
                .replaceAll("(?m)^# (.*)$", "<h2>$1</h2>")
                .replaceAll("\\*\\*(.*?)\\*\\*", "<strong>$1</strong>")
                .replaceAll("_(.*?)_", "<em>$1</em>")
                .replaceAll("\n", "<br/>\n");
    }

    public record ExportPayload(String content, String contentType, String filename) {}
}
