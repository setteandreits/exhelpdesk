package com.exprivia.exhelpdesk.dto;

import lombok.Data;

import java.util.Map;

@Data
public class StatsMyDto {
    private Map<String, Long> byStatus;
    private long total;
}
