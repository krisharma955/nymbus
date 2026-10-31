package com.graviton.nymbus.tool.model;

public record SearchResult(
        String title,
        String url,
        String content,
        Double score
) {}
