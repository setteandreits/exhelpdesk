package com.exprivia.exhelpdesk.repository;

import com.exprivia.exhelpdesk.model.Allegato;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AllegatoRepository extends JpaRepository<Allegato, String> {
    List<Allegato> findByTicketId(String ticketId);
}