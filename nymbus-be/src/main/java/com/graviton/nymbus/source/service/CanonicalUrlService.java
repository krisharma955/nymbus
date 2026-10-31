package com.graviton.nymbus.source.service;

import org.springframework.stereotype.Service;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;

@Service
public class CanonicalUrlService {

    public String canonicalize(String url) {
        if (url == null || url.isBlank()) {
            return "";
        }
        try {
            URI uri = URI.create(url.trim());
            String scheme = uri.getScheme() != null ? uri.getScheme().toLowerCase() : "https";
            String host = uri.getHost() != null ? uri.getHost().toLowerCase() : "";
            if (host.startsWith("www.")) {
                host = host.substring(4);
            }
            String path = uri.getPath() != null ? uri.getPath() : "";
            if (path.endsWith("/") && path.length() > 1) {
                path = path.substring(0, path.length() - 1);
            }

            String query = uri.getRawQuery();
            String cleanQuery = "";
            if (query != null && !query.isBlank()) {
                List<String> retainedParams = Arrays.stream(query.split("&"))
                        .filter(param -> {
                            String key = param.split("=")[0].toLowerCase();
                            return !key.startsWith("utm_") && !key.equals("fbclid") && !key.equals("gclid") && !key.equals("ref");
                        })
                        .sorted()
                        .toList();
                if (!retainedParams.isEmpty()) {
                    cleanQuery = "?" + String.join("&", retainedParams);
                }
            }

            return scheme + "://" + host + path + cleanQuery;
        } catch (Exception e) {
            return url.trim().toLowerCase();
        }
    }

    public String sha256Hex(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(text.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    public String extractDomain(String url) {
        if (url == null || url.isBlank()) {
            return "unknown";
        }
        try {
            URI uri = URI.create(url.trim());
            String host = uri.getHost();
            if (host != null) {
                return host.startsWith("www.") ? host.substring(4) : host;
            }
        } catch (Exception ignored) {}
        return "unknown";
    }
}
