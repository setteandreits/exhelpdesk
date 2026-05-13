package com.exprivia.exhelpdesk.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @NotBlank
    private String nome;

    @NotBlank
    private String cognome;

    @Email @NotBlank
    @Column(unique = true)
    private String email;

    @NotBlank
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    private Role ruolo;

    private String reparto;

    @Column(columnDefinition = "TEXT")
    private String fotoProfiloUrl;

    private LocalDateTime dataRegistrazione;

    private boolean attivo = true;

    public enum Role {
        ROLE_EMPLOYEE, ROLE_OPERATOR, ROLE_ADMIN
    }

    @PrePersist
    public void prePersist() {
        this.dataRegistrazione = LocalDateTime.now();
    }
}
