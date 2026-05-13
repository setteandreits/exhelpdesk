package com.exprivia.exhelpdesk.dto;

import com.exprivia.exhelpdesk.model.Ticket;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ChangeStatusRequest {
    @NotNull private Ticket.Stato stato;
    @NotBlank private String nota;
}