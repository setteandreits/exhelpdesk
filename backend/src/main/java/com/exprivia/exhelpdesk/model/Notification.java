package com.exprivia.exhelpdesk.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destinatario_id")
    private User destinatario;

    @Enumerated(EnumType.STRING)
    private Tipo tipo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id")
    private Ticket ticket;

    private String messaggio;
    private boolean letta = false;
    private LocalDateTime dataCreazione;

    @PrePersist
    public void prePersist() {
        this.dataCreazione = LocalDateTime.now();
    }

    public enum Tipo {
        STATO_CAMBIATO, NUOVO_COMMENTO, ASSEGNAZIONE
    }
}