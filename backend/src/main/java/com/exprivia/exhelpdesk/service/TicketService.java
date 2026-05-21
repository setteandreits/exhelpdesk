package com.exprivia.exhelpdesk.service;

import com.exprivia.exhelpdesk.dto.AttachmentDto;
import com.exprivia.exhelpdesk.dto.ChangeStatusRequest;
import com.exprivia.exhelpdesk.dto.TicketDto;
import com.exprivia.exhelpdesk.dto.TicketHistoryDto;
import com.exprivia.exhelpdesk.dto.TicketRequest;
import com.exprivia.exhelpdesk.dto.UpdateTicketRequest;
import com.exprivia.exhelpdesk.exception.ResourceNotFoundException;
import com.exprivia.exhelpdesk.model.Allegato;
import com.exprivia.exhelpdesk.model.Notification;
import com.exprivia.exhelpdesk.model.Ticket;
import com.exprivia.exhelpdesk.model.TicketHistory;
import com.exprivia.exhelpdesk.model.User;
import com.exprivia.exhelpdesk.repository.AllegatoRepository;
import com.exprivia.exhelpdesk.repository.NotificationRepository;
import com.exprivia.exhelpdesk.repository.TicketHistoryRepository;
import com.exprivia.exhelpdesk.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final TicketHistoryRepository historyRepository;
    private final NotificationRepository notificationRepository;
    private final AllegatoRepository allegatoRepository;
    private final UserService userService;
    private final StorageService storageService;

    @Transactional
    public TicketDto create(String email, TicketRequest req) {
        User richiedente = userService.getByEmail(email);
        Ticket ticket = Ticket.builder()
                .titolo(req.getTitolo())
                .descrizione(req.getDescrizione())
                .categoria(req.getCategoria())
                .priorita(req.getPriorita())
                .stato(Ticket.Stato.APERTO)
                .richiedente(richiedente)
                .repartoDestinazione(req.getRepartoDestinazione())
                .tag(req.getTag() != null ? new ArrayList<>(req.getTag()) : new ArrayList<>())
                .build();
        return TicketDto.from(ticketRepository.save(ticket));
    }

    @Transactional(readOnly = true)
    public Page<TicketDto> list(String email, String ruolo, Ticket.Stato stato,
                                Ticket.Categoria categoria, Ticket.Priorita priorita,
                                Ticket.Reparto reparto, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("dataApertura").descending());
        List<Ticket> tickets;
        if ("ROLE_EMPLOYEE".equals(ruolo)) {
            User user = userService.getByEmail(email);
            tickets = ticketRepository.findByRichiedente(user);
        } else {
            tickets = ticketRepository.findAll();
        }

        List<TicketDto> filtered = tickets.stream()
                .filter(ticket -> stato == null || ticket.getStato() == stato)
                .filter(ticket -> categoria == null || ticket.getCategoria() == categoria)
                .filter(ticket -> priorita == null || ticket.getPriorita() == priorita)
                .filter(ticket -> reparto == null || ticket.getRepartoDestinazione() == reparto)
                .sorted((left, right) -> {
                    LocalDateTime leftDate = left.getDataApertura() != null ? left.getDataApertura() : LocalDateTime.MIN;
                    LocalDateTime rightDate = right.getDataApertura() != null ? right.getDataApertura() : LocalDateTime.MIN;
                    return rightDate.compareTo(leftDate);
                })
                .map(TicketDto::from)
                .toList();

        int start = Math.min((int) pageable.getOffset(), filtered.size());
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        return new PageImpl<>(filtered.subList(start, end), pageable, filtered.size());
    }

    @Transactional(readOnly = true)
    public TicketDto getById(String id, String email) {
        return TicketDto.from(requireAccessible(id, email));
    }

    @Transactional
    public TicketDto update(String ticketId, String email, UpdateTicketRequest req) {
        Ticket ticket = requireAccessible(ticketId, email);
        if (!ticket.getRichiedente().getEmail().equals(email) && !userService.isOperatorOrAdmin(email)) {
            throw new IllegalArgumentException("Non autorizzato a modificare questo ticket");
        }
        if (req.getTitolo() != null && !req.getTitolo().isBlank()) ticket.setTitolo(req.getTitolo());
        if (req.getDescrizione() != null && !req.getDescrizione().isBlank()) ticket.setDescrizione(req.getDescrizione());
        if (req.getCategoria() != null) ticket.setCategoria(req.getCategoria());
        if (req.getPriorita() != null) ticket.setPriorita(req.getPriorita());
        if (req.getRepartoDestinazione() != null) ticket.setRepartoDestinazione(req.getRepartoDestinazione());
        if (req.getTag() != null) ticket.setTag(req.getTag());
        return TicketDto.from(ticketRepository.save(ticket));
    }

    @Transactional
    public TicketDto changeStatus(String ticketId, String operatoreEmail, ChangeStatusRequest req) {
        Ticket ticket = findById(ticketId);
        User operatore = userService.getByEmail(operatoreEmail);
        boolean isOperatorOrAdmin = operatore.getRuolo() == User.Role.ROLE_OPERATOR || operatore.getRuolo() == User.Role.ROLE_ADMIN;
        boolean isOwner = ticket.getRichiedente() != null && ticket.getRichiedente().getEmail().equals(operatoreEmail);

        if (!isOperatorOrAdmin) {
            if (!isOwner) {
                throw new IllegalArgumentException("Non autorizzato a modificare questo ticket");
            }
            if (req.getStato() != Ticket.Stato.CHIUSO && req.getStato() != Ticket.Stato.APERTO) {
                throw new IllegalArgumentException("Puoi solo chiudere o riaprire i tuoi ticket");
            }
        }

        if (ticket.getStato() == req.getStato()) {
            return TicketDto.from(ticket);
        }

        TicketHistory history = TicketHistory.builder()
                .ticket(ticket)
                .statoPrecedente(ticket.getStato())
                .statoNuovo(req.getStato())
                .nota(req.getNota())
                .utente(operatore)
                .build();
        historyRepository.save(history);

        ticket.setStato(req.getStato());
        if (req.getStato() == Ticket.Stato.RISOLTO || req.getStato() == Ticket.Stato.CHIUSO) {
            ticket.setDataChiusura(LocalDateTime.now());
        } else {
            ticket.setDataChiusura(null);
        }
        ticketRepository.save(ticket);

        if (isOperatorOrAdmin && ticket.getRichiedente() != null && !ticket.getRichiedente().getEmail().equals(operatoreEmail)) {
            notificationRepository.save(Notification.builder()
                    .destinatario(ticket.getRichiedente())
                    .tipo(Notification.Tipo.STATO_CAMBIATO)
                    .ticket(ticket)
                    .messaggio("Il tuo ticket '" + ticket.getTitolo() + "' e' ora in stato: " + req.getStato().name())
                    .build());
        }

        return TicketDto.from(ticket);
    }

    @Transactional
    public TicketDto assign(String ticketId, String operatoreEmail) {
        Ticket ticket = findById(ticketId);
        User operatore = userService.getByEmail(operatoreEmail);
        ticket.setOperatore(operatore);
        ticket.setStato(Ticket.Stato.IN_CARICO);

        historyRepository.save(TicketHistory.builder()
                .ticket(ticket)
                .statoPrecedente(Ticket.Stato.APERTO)
                .statoNuovo(Ticket.Stato.IN_CARICO)
                .nota("Ticket preso in carico")
                .utente(operatore)
                .build());

        notificationRepository.save(Notification.builder()
                .destinatario(operatore)
                .tipo(Notification.Tipo.ASSEGNAZIONE)
                .ticket(ticket)
                .messaggio("Ti e' stato assegnato il ticket: " + ticket.getTitolo())
                .build());

        return TicketDto.from(ticketRepository.save(ticket));
    }

    @Transactional
    public void delete(String ticketId, String email) {
        Ticket ticket = findById(ticketId);
        if (ticket.getStato() != Ticket.Stato.APERTO) {
            throw new IllegalArgumentException("Puoi eliminare solo ticket in stato APERTO");
        }
        if (!ticket.getRichiedente().getEmail().equals(email)) {
            throw new IllegalArgumentException("Non autorizzato");
        }
        allegatoRepository.findByTicketId(ticketId).forEach(allegato -> storageService.deleteObject(allegato.getS3Key()));
        ticketRepository.delete(ticket);
    }

    @Transactional(readOnly = true)
    public List<TicketHistoryDto> getHistory(String ticketId, String email) {
        requireAccessible(ticketId, email);
        return historyRepository.findByTicketIdOrderByTimestampAsc(ticketId).stream()
                .map(TicketHistoryDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<TicketDto> search(String query, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("dataApertura").descending());
        return ticketRepository.fullTextSearch(query, pageable).map(TicketDto::from);
    }

    @Transactional
    public AttachmentDto uploadAttachment(String ticketId, String email, MultipartFile file) {
        requireAccessible(ticketId, email);
        AttachmentDto uploaded = storageService.uploadTicketAttachment(ticketId, file);
        Allegato saved = allegatoRepository.save(Allegato.builder()
                .ticket(findById(ticketId))
                .nomeFile(uploaded.getNomeFile())
                .s3Key(uploaded.getS3Key())
                .url(uploaded.getUrl())
                .dimensione(uploaded.getDimensione())
                .build());
        return AttachmentDto.from(saved);
    }

    @Transactional(readOnly = true)
    public List<AttachmentDto> listAttachments(String ticketId, String email) {
        requireAccessible(ticketId, email);
        return allegatoRepository.findByTicketId(ticketId).stream()
                .map(allegato -> {
                    allegato.setUrl(storageService.generatePresignedUrl(allegato.getS3Key()));
                    return AttachmentDto.from(allegato);
                })
                .toList();
    }

    @Transactional
    public void deleteAttachment(String ticketId, String attachmentId, String email) {
        Ticket ticket = requireAccessible(ticketId, email);
        if (!ticket.getRichiedente().getEmail().equals(email) && !userService.isOperatorOrAdmin(email)) {
            throw new IllegalArgumentException("Non autorizzato a eliminare allegati");
        }
        Allegato allegato = allegatoRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Allegato non trovato"));
        if (!ticketId.equals(allegato.getTicket().getId())) {
            throw new IllegalArgumentException("Allegato non associato al ticket richiesto");
        }
        storageService.deleteObject(allegato.getS3Key());
        allegatoRepository.delete(allegato);
    }

    @Transactional(readOnly = true)
    public Ticket requireAccessible(String ticketId, String email) {
        Ticket ticket = findById(ticketId);
        if (userService.isOperatorOrAdmin(email) || ticket.getRichiedente().getEmail().equals(email)) {
            return ticket;
        }
        throw new IllegalArgumentException("Non autorizzato ad accedere a questo ticket");
    }

    @Transactional(readOnly = true)
    public Ticket findById(String id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket non trovato: " + id));
    }
}
