package com.exprivia.exhelpdesk.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tickets")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @NotBlank
    @Size(max = 120)
    private String titolo;

    @NotBlank
    @Column(columnDefinition = "TEXT")
    private String descrizione;

    @Enumerated(EnumType.STRING)
    private Categoria categoria;

    @Enumerated(EnumType.STRING)
    private Priorita priorita;

    @Enumerated(EnumType.STRING)
    private Stato stato;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "richiedente_id")
    private User richiedente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "operatore_id")
    private User operatore;

    @Enumerated(EnumType.STRING)
    private Reparto repartoDestinazione;

    private LocalDateTime dataApertura;
    private LocalDateTime dataChiusura;

    @ElementCollection
    @CollectionTable(name = "ticket_tags", joinColumns = @JoinColumn(name = "ticket_id"))
    @Column(name = "tag")
    private List<String> tag = new ArrayList<>();

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Allegato> allegati = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        this.dataApertura = LocalDateTime.now();
        if (this.stato == null) this.stato = Stato.APERTO;
    }

    public enum Categoria { IT, HR, AMMINISTRAZIONE, FACILITY, ALTRO }
    public enum Priorita  { BASSA, MEDIA, ALTA, CRITICA }
    public enum Stato     { APERTO, IN_CARICO, IN_ATTESA, RISOLTO, CHIUSO }
    public enum Reparto   { IT, HR, AMMINISTRAZIONE, FACILITY }
}