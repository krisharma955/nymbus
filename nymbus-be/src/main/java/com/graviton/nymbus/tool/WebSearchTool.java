package com.graviton.nymbus.tool;

import com.graviton.nymbus.tool.model.SearchResult;

import java.util.List;

public interface WebSearchTool {
    List<SearchResult> search(String query, int maxResults);
}
