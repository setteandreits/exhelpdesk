package com.exprivia.exhelpdesk.dto;

import com.exprivia.exhelpdesk.model.Allegato;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AttachmentDto {
    private String id;
    private String nomeFile;
    private String s3Key;
    private String url;
    private Long dimensione;
    private LocalDateTime dataUpload;

    public static AttachmentDto from(Allegato allegato) {
        AttachmentDto dto = new AttachmentDto();
        dto.setId(allegato.getId());
        dto.setNomeFile(allegato.getNomeFile());
        dto.setS3Key(allegato.getS3Key());
        dto.setUrl(allegato.getUrl());
        dto.setDimensione(allegato.getDimensione());
        dto.setDataUpload(allegato.getDataUpload());
        return dto;
    }
}
