package com.exprivia.exhelpdesk.controller;

import com.exprivia.exhelpdesk.dto.AttachmentDto;
import com.exprivia.exhelpdesk.dto.ChangeStatusRequest;
import com.exprivia.exhelpdesk.dto.CommentDto;
import com.exprivia.exhelpdesk.dto.CommentRequest;
import com.exprivia.exhelpdesk.dto.TicketDto;
import com.exprivia.exhelpdesk.dto.TicketHistoryDto;
import com.exprivia.exhelpdesk.dto.TicketRequest;
import com.exprivia.exhelpdesk.dto.UpdateTicketRequest;
import com.exprivia.exhelpdesk.model.Ticket;
import com.exprivia.exhelpdesk.service.CommentService;
import com.exprivia.exhelpdesk.service.TicketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/tickets")
@RequiredArgsConstructor
@Tag(name = "Tickets", description = "Gestione ticket")
public class TicketController {

    private final TicketService ticketService;
    private final CommentService commentService;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_EMPLOYEE','ROLE_OPERATOR','ROLE_ADMIN')")
    @Operation(summary = "Crea nuovo ticket")
    public ResponseEntity<TicketDto> create(Principal principal, @Valid @RequestBody TicketRequest req) {
        return ResponseEntity.ok(ticketService.create(principal.getName(), req));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lista ticket")
    public ResponseEntity<Page<TicketDto>> list(
            Principal principal,
            Authentication authentication,
            @RequestParam(required = false) Ticket.Stato stato,
            @RequestParam(required = false) Ticket.Categoria categoria,
            @RequestParam(required = false) Ticket.Priorita priorita,
            @RequestParam(required = false) Ticket.Reparto reparto,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String role = authentication.getAuthorities().stream()
                .map(grantedAuthority -> grantedAuthority.getAuthority())
                .findFirst()
                .orElse("ROLE_EMPLOYEE");
        return ResponseEntity.ok(ticketService.list(principal.getName(), role, stato, categoria, priorita, reparto, page, size));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Dettaglio ticket")
    public ResponseEntity<TicketDto> getById(@PathVariable String id, Principal principal) {
        return ResponseEntity.ok(ticketService.getById(id, principal.getName()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Modifica ticket")
    public ResponseEntity<TicketDto> update(@PathVariable String id,
                                            Principal principal,
                                            @RequestBody UpdateTicketRequest req) {
        return ResponseEntity.ok(ticketService.update(id, principal.getName(), req));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('ROLE_OPERATOR','ROLE_ADMIN')")
    @Operation(summary = "Cambia stato ticket")
    public ResponseEntity<TicketDto> changeStatus(@PathVariable String id,
                                                  Principal principal,
                                                  @Valid @RequestBody ChangeStatusRequest req) {
        return ResponseEntity.ok(ticketService.changeStatus(id, principal.getName(), req));
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAnyAuthority('ROLE_OPERATOR','ROLE_ADMIN')")
    @Operation(summary = "Prendi in carico ticket")
    public ResponseEntity<TicketDto> assign(@PathVariable String id, Principal principal) {
        return ResponseEntity.ok(ticketService.assign(id, principal.getName()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_EMPLOYEE','ROLE_OPERATOR','ROLE_ADMIN')")
    @Operation(summary = "Elimina ticket (solo APERTO)")
    public ResponseEntity<Void> delete(@PathVariable String id, Principal principal) {
        ticketService.delete(id, principal.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/attachments")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Upload allegato ticket")
    public ResponseEntity<AttachmentDto> uploadAttachment(@PathVariable String id,
                                                          Principal principal,
                                                          @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ticketService.uploadAttachment(id, principal.getName(), file));
    }

    @GetMapping("/{id}/attachments")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lista allegati ticket")
    public ResponseEntity<List<AttachmentDto>> listAttachments(@PathVariable String id, Principal principal) {
        return ResponseEntity.ok(ticketService.listAttachments(id, principal.getName()));
    }

    @DeleteMapping("/{id}/attachments/{attachmentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Elimina allegato ticket")
    public ResponseEntity<Void> deleteAttachment(@PathVariable String id,
                                                 @PathVariable String attachmentId,
                                                 Principal principal) {
        ticketService.deleteAttachment(id, attachmentId, principal.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Storico stati ticket")
    public ResponseEntity<List<TicketHistoryDto>> getHistory(@PathVariable String id, Principal principal) {
        return ResponseEntity.ok(ticketService.getHistory(id, principal.getName()));
    }

    @GetMapping("/{id}/comments")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lista commenti ticket")
    public ResponseEntity<List<CommentDto>> listComments(@PathVariable String id, Principal principal) {
        return ResponseEntity.ok(commentService.listByTicket(id, principal.getName()));
    }

    @PostMapping("/{id}/comments")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Aggiungi commento ticket")
    public ResponseEntity<CommentDto> addComment(@PathVariable String id,
                                                 Principal principal,
                                                 @RequestParam("testo") String testo,
                                                 @RequestParam(value = "file", required = false) MultipartFile file) {
        return ResponseEntity.ok(commentService.create(id, principal.getName(), testo, file));
    }

    @PutMapping("/{id}/comments/{commentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Modifica commento ticket")
    public ResponseEntity<CommentDto> updateComment(@PathVariable String id,
                                                    @PathVariable String commentId,
                                                    Principal principal,
                                                    @Valid @RequestBody CommentRequest req) {
        return ResponseEntity.ok(commentService.update(id, commentId, principal.getName(), req.getTesto()));
    }

    @DeleteMapping("/{id}/comments/{commentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Elimina commento ticket")
    public ResponseEntity<Void> deleteComment(@PathVariable String id,
                                              @PathVariable String commentId,
                                              Principal principal) {
        commentService.delete(id, commentId, principal.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Ricerca full-text")
    public ResponseEntity<Page<TicketDto>> search(@RequestParam String q,
                                                  @RequestParam(defaultValue = "0") int page,
                                                  @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ticketService.search(q, page, size));
    }
}
