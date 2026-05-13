package com.exprivia.exhelpdesk.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HomeController {

    @GetMapping("/api")
    public ResponseEntity<Map<String, Object>> home() {
        return ResponseEntity.ok(Map.of(
                "name", "exhelpdesk",
                "status", "ok",
                "publicTickets", "/api/tickets",
                "auth", "/api/v1/auth/login"
        ));
    }
}

