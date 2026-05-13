package com.exprivia.exhelpdesk.dto;

import com.exprivia.exhelpdesk.model.Ticket;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class TicketDto {
    private String id;
    private String titolo;
    private String descrizione;
    private String categoria;
    private String priorita;
    private String stato;
    private UserDto richiedente;
    private UserDto operatore;
    private String repartoDestinazione;
    private LocalDateTime dataApertura;
    private LocalDateTime dataChiusura;
    private List<String> tag;

    public static TicketDto from(Ticket t) {
        TicketDto dto = new TicketDto();
        dto.setId(t.getId());
        dto.setTitolo(t.getTitolo());
        dto.setDescrizione(t.getDescrizione());
        dto.setCategoria(t.getCategoria() != null ? t.getCategoria().name() : null);
        dto.setPriorita(t.getPriorita() != null ? t.getPriorita().name() : null);
        dto.setStato(t.getStato() != null ? t.getStato().name() : null);
        dto.setRepartoDestinazione(t.getRepartoDestinazione() != null ? t.getRepartoDestinazione().name() : null);
        dto.setDataApertura(t.getDataApertura());
        dto.setDataChiusura(t.getDataChiusura());
        dto.setTag(t.getTag());
        if (t.getRichiedente() != null) dto.setRichiedente(UserDto.from(t.getRichiedente()));
        if (t.getOperatore() != null) dto.setOperatore(UserDto.from(t.getOperatore()));
        return dto;
    }
}
