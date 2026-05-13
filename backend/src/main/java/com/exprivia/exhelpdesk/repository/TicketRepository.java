package com.exprivia.exhelpdesk.repository;

import com.exprivia.exhelpdesk.model.Ticket;
import com.exprivia.exhelpdesk.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TicketRepository extends JpaRepository<Ticket, String> {

    Page<Ticket> findByRichiedente(User richiedente, Pageable pageable);

    List<Ticket> findByRichiedente(User richiedente);

    @Query("SELECT t FROM Ticket t WHERE " +
           "(:stato IS NULL OR t.stato = :stato) AND " +
           "(:categoria IS NULL OR t.categoria = :categoria) AND " +
           "(:priorita IS NULL OR t.priorita = :priorita) AND " +
           "(:reparto IS NULL OR t.repartoDestinazione = :reparto)")
    Page<Ticket> findWithFilters(
        @Param("stato") Ticket.Stato stato,
        @Param("categoria") Ticket.Categoria categoria,
        @Param("priorita") Ticket.Priorita priorita,
        @Param("reparto") Ticket.Reparto reparto,
        Pageable pageable
    );

    @Query("SELECT t FROM Ticket t WHERE " +
           "LOWER(t.titolo) LIKE LOWER(CONCAT('%',:q,'%')) OR " +
           "LOWER(t.descrizione) LIKE LOWER(CONCAT('%',:q,'%'))")
    Page<Ticket> fullTextSearch(@Param("q") String query, Pageable pageable);
}
