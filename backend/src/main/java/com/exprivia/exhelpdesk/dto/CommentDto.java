package com.exprivia.exhelpdesk.dto;

import com.exprivia.exhelpdesk.model.Comment;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CommentDto {
    private String id;
    private String testo;
    private UserDto autore;
    private AttachmentDto allegato;
    private LocalDateTime dataCreazione;
    private LocalDateTime dataModifica;
    private boolean eliminato;

    public static CommentDto from(Comment comment) {
        CommentDto dto = new CommentDto();
        dto.setId(comment.getId());
        dto.setTesto(comment.getTesto());
        dto.setDataCreazione(comment.getDataCreazione());
        dto.setDataModifica(comment.getDataModifica());
        dto.setEliminato(comment.isEliminato());
        if (comment.getAutore() != null) {
            dto.setAutore(UserDto.from(comment.getAutore()));
        }
        if (comment.getAllegatoS3Key() != null) {
            AttachmentDto attachment = new AttachmentDto();
            attachment.setNomeFile(comment.getAllegatoNomeFile());
            attachment.setS3Key(comment.getAllegatoS3Key());
            attachment.setUrl(comment.getAllegatoUrl());
            dto.setAllegato(attachment);
        }
        return dto;
    }
}
