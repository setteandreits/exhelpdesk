package com.exprivia.exhelpdesk.dto;

import com.exprivia.exhelpdesk.model.TicketHistory;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class TicketHistoryDto {
    private String id;
    private String statoPrecedente;
    private String statoNuovo;
    private String nota;
    private UserDto utente;
    private LocalDateTime timestamp;

    public static TicketHistoryDto from(TicketHistory history) {
        TicketHistoryDto dto = new TicketHistoryDto();
        dto.setId(history.getId());
        dto.setStatoPrecedente(history.getStatoPrecedente() != null ? history.getStatoPrecedente().name() : null);
        dto.setStatoNuovo(history.getStatoNuovo() != null ? history.getStatoNuovo().name() : null);
        dto.setNota(history.getNota());
        dto.setTimestamp(history.getTimestamp());
        if (history.getUtente() != null) {
            dto.setUtente(UserDto.from(history.getUtente()));
        }
        return dto;
    }
}
