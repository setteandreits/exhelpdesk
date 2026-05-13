package com.exprivia.exhelpdesk.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ticket_history")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TicketHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id")
    private Ticket ticket;

    @Enumerated(EnumType.STRING)
    private Ticket.Stato statoPrecedente;

    @Enumerated(EnumType.STRING)
    private Ticket.Stato statoNuovo;

    private String nota;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utente_id")
    private User utente;

    private LocalDateTime timestamp;

    @PrePersist
    public void prePersist() {
        this.timestamp = LocalDateTime.now();
    }
}