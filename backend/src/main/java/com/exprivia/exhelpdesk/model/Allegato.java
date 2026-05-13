package com.exprivia.exhelpdesk.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "allegati")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Allegato {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id")
    private Ticket ticket;

    private String nomeFile;
    private String s3Key;
    private String url;
    private Long dimensione;
    private LocalDateTime dataUpload;

    @PrePersist
    public void prePersist() {
        this.dataUpload = LocalDateTime.now();
    }
}