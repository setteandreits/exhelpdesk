package com.exprivia.exhelpdesk.controller;

import com.exprivia.exhelpdesk.dto.TicketDto;
import com.exprivia.exhelpdesk.service.TicketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
@Tag(name = "Tickets Public", description = "API pubblica per i ticket")
public class PublicTicketController {

    private final TicketService ticketService;

    @GetMapping
    @Operation(summary = "Lista pubblica ticket")
    public ResponseEntity<List<TicketDto>> listPublic() {
        try {
            return ResponseEntity.ok(ticketService.list("public", "ROLE_ADMIN", null, null, null, null, 0, 1000).getContent());
        } catch (Exception ex) {
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/{id}")
    @Operation(summary = "Dettaglio pubblico ticket")
    public ResponseEntity<TicketDto> getById(@PathVariable String id) {
        try {
            return ResponseEntity.ok(TicketDto.from(ticketService.findById(id)));
        } catch (Exception ex) {
            return ResponseEntity.notFound().build();
        }
    }
}
