package com.exprivia.exhelpdesk.dto;

import lombok.Data;

import java.util.Map;

@Data
public class OverviewStatsDto {
    private Map<String, Long> byStatus;
    private Map<String, Long> byCategory;
    private Map<String, Long> byPriority;
    private Map<String, Long> topOpenCategories;
    private Map<String, Long> last30Days;
    private Map<String, Double> avgResolutionHoursByCategory;
}
