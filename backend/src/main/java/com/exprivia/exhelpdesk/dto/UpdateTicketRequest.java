package com.exprivia.exhelpdesk.dto;

import com.exprivia.exhelpdesk.model.Ticket;
import lombok.Data;

import java.util.List;

@Data
public class UpdateTicketRequest {
    private String titolo;
    private String descrizione;
    private Ticket.Categoria categoria;
    private Ticket.Priorita priorita;
    private Ticket.Reparto repartoDestinazione;
    private List<String> tag;
}
