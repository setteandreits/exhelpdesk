package com.exprivia.exhelpdesk.service;

import com.exprivia.exhelpdesk.dto.AttachmentDto;
import com.exprivia.exhelpdesk.dto.CommentDto;
import com.exprivia.exhelpdesk.exception.ResourceNotFoundException;
import com.exprivia.exhelpdesk.model.Comment;
import com.exprivia.exhelpdesk.model.Notification;
import com.exprivia.exhelpdesk.model.Ticket;
import com.exprivia.exhelpdesk.model.User;
import com.exprivia.exhelpdesk.repository.CommentRepository;
import com.exprivia.exhelpdesk.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CommentService {

    private static final Duration EDIT_WINDOW = Duration.ofMinutes(15);

    private final CommentRepository commentRepository;
    private final NotificationRepository notificationRepository;
    private final UserService userService;
    private final TicketService ticketService;
    private final StorageService storageService;

    @Transactional(readOnly = true)
    public List<CommentDto> listByTicket(String ticketId, String email) {
        ticketService.requireAccessible(ticketId, email);
        return commentRepository.findByTicketIdAndEliminatoFalseOrderByDataCreazioneAsc(ticketId).stream()
                .map(CommentDto::from)
                .toList();
    }

    @Transactional
    public CommentDto create(String ticketId, String email, String testo, MultipartFile file) {
        Ticket ticket = ticketService.requireAccessible(ticketId, email);
        User autore = userService.getByEmail(email);

        Comment comment = Comment.builder()
                .ticket(ticket)
                .autore(autore)
                .testo(testo)
                .build();

        if (file != null && !file.isEmpty()) {
            AttachmentDto attachment = storageService.uploadTicketAttachment(ticketId, file);
            comment.setAllegatoNomeFile(attachment.getNomeFile());
            comment.setAllegatoS3Key(attachment.getS3Key());
            comment.setAllegatoUrl(attachment.getUrl());
        }

        Comment saved = commentRepository.save(comment);
        notifyParticipants(ticket, autore);
        return CommentDto.from(saved);
    }

    @Transactional
    public CommentDto update(String ticketId, String commentId, String email, String testo) {
        ticketService.requireAccessible(ticketId, email);
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Commento non trovato"));
        if (!comment.getAutore().getEmail().equals(email)) {
            throw new IllegalArgumentException("Puoi modificare solo i tuoi commenti");
        }
        if (comment.getDataCreazione() == null
                || Duration.between(comment.getDataCreazione(), LocalDateTime.now()).compareTo(EDIT_WINDOW) > 0) {
            throw new IllegalArgumentException("Puoi modificare il commento solo entro 15 minuti");
        }
        comment.setTesto(testo);
        comment.setDataModifica(LocalDateTime.now());
        return CommentDto.from(commentRepository.save(comment));
    }

    @Transactional
    public void delete(String ticketId, String commentId, String email) {
        ticketService.requireAccessible(ticketId, email);
        User actor = userService.getByEmail(email);
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Commento non trovato"));
        boolean isAdmin = actor.getRuolo() == User.Role.ROLE_ADMIN;
        if (!isAdmin && !comment.getAutore().getId().equals(actor.getId())) {
            throw new IllegalArgumentException("Non autorizzato a eliminare questo commento");
        }
        comment.setEliminato(true);
        comment.setDataModifica(LocalDateTime.now());
        commentRepository.save(comment);
    }

    private void notifyParticipants(Ticket ticket, User autore) {
        if (!ticket.getRichiedente().getId().equals(autore.getId())) {
            notificationRepository.save(Notification.builder()
                    .destinatario(ticket.getRichiedente())
                    .tipo(Notification.Tipo.NUOVO_COMMENTO)
                    .ticket(ticket)
                    .messaggio("Nuovo commento sul ticket '" + ticket.getTitolo() + "'")
                    .build());
        }
        if (ticket.getOperatore() != null && !ticket.getOperatore().getId().equals(autore.getId())) {
            notificationRepository.save(Notification.builder()
                    .destinatario(ticket.getOperatore())
                    .tipo(Notification.Tipo.NUOVO_COMMENTO)
                    .ticket(ticket)
                    .messaggio("Nuovo commento sul ticket '" + ticket.getTitolo() + "'")
                    .build());
        }
    }
}
