package com.exprivia.exhelpdesk.dto;

import com.exprivia.exhelpdesk.model.Ticket;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.List;

@Data
public class TicketRequest {
    @NotBlank @Size(max = 120) private String titolo;
    @NotBlank private String descrizione;
    @NotNull private Ticket.Categoria categoria;
    @NotNull private Ticket.Priorita priorita;
    @NotNull private Ticket.Reparto repartoDestinazione;
    private List<String> tag;
}