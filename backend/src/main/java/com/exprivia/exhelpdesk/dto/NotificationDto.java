package com.exprivia.exhelpdesk.dto;

import com.exprivia.exhelpdesk.model.Notification;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class NotificationDto {
    private String id;
    private String tipo;
    private String messaggio;
    private boolean letta;
    private LocalDateTime dataCreazione;
    private String ticketId;

    public static NotificationDto from(Notification notification) {
        NotificationDto dto = new NotificationDto();
        dto.setId(notification.getId());
        dto.setTipo(notification.getTipo().name());
        dto.setMessaggio(notification.getMessaggio());
        dto.setLetta(notification.isLetta());
        dto.setDataCreazione(notification.getDataCreazione());
        dto.setTicketId(notification.getTicket() != null ? notification.getTicket().getId() : null);
        return dto;
    }
}
