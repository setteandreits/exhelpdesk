package com.exprivia.exhelpdesk.dto;

import com.exprivia.exhelpdesk.model.User;
import lombok.Data;

@Data
public class UserDto {
    private String id;
    private String nome;
    private String cognome;
    private String email;
    private String ruolo;
    private String reparto;
    private String fotoProfiloUrl;

    public static UserDto from(User u) {
        UserDto dto = new UserDto();
        dto.setId(u.getId());
        dto.setNome(u.getNome());
        dto.setCognome(u.getCognome());
        dto.setEmail(u.getEmail());
        dto.setRuolo(u.getRuolo().name());
        dto.setReparto(u.getReparto());
        dto.setFotoProfiloUrl(u.getFotoProfiloUrl());
        return dto;
    }
}