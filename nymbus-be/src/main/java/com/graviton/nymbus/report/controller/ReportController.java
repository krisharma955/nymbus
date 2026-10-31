package com.graviton.nymbus.report.controller;

import com.graviton.nymbus.report.dto.ReportDetailResponse;
import com.graviton.nymbus.report.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/{reportId}")
    public ResponseEntity<ReportDetailResponse> getReport(@PathVariable UUID reportId) {
        ReportDetailResponse response = reportService.getReportDetail(reportId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{reportId}/export")
    public ResponseEntity<byte[]> exportReport(
            @PathVariable UUID reportId,
            @RequestParam(value = "format", defaultValue = "markdown") String format) {
        ReportService.ExportPayload export = reportService.exportReport(reportId, format);

        byte[] contentBytes = export.content().getBytes(StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + export.filename() + "\"")
                .header(HttpHeaders.CONTENT_TYPE, export.contentType())
                .body(contentBytes);
    }
}
