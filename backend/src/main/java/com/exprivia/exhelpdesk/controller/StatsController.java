package com.exprivia.exhelpdesk.controller;

import com.exprivia.exhelpdesk.dto.OverviewStatsDto;
import com.exprivia.exhelpdesk.dto.StatsMyDto;
import com.exprivia.exhelpdesk.service.StatsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/stats")
@RequiredArgsConstructor
@Tag(name = "Stats", description = "Statistiche ticket")
public class StatsController {

    private final StatsService statsService;

    @GetMapping("/overview")
    @PreAuthorize("hasAnyAuthority('ROLE_OPERATOR','ROLE_ADMIN')")
    @Operation(summary = "Statistiche globali")
    public ResponseEntity<OverviewStatsDto> overview() {
        return ResponseEntity.ok(statsService.getOverview());
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyAuthority('ROLE_EMPLOYEE','ROLE_OPERATOR','ROLE_ADMIN')")
    @Operation(summary = "Statistiche personali")
    public ResponseEntity<StatsMyDto> my(Principal principal) {
        return ResponseEntity.ok(statsService.getMyStats(principal.getName()));
    }
}
