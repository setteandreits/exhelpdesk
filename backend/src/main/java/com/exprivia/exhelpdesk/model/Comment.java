package com.exprivia.exhelpdesk.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "comments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id")
    private Ticket ticket;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "autore_id")
    private User autore;

    @Column(columnDefinition = "TEXT")
    private String testo;

    private String allegatoNomeFile;
    private String allegatoS3Key;
    private String allegatoUrl;

    private LocalDateTime dataCreazione;
    private LocalDateTime dataModifica;
    private boolean eliminato = false;

    @PrePersist
    public void prePersist() {
        this.dataCreazione = LocalDateTime.now();
    }
}