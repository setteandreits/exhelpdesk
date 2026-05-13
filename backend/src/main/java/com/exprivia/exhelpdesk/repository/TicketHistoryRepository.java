package com.exprivia.exhelpdesk.repository;

import com.exprivia.exhelpdesk.model.TicketHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TicketHistoryRepository extends JpaRepository<TicketHistory, String> {
    List<TicketHistory> findByTicketIdOrderByTimestampAsc(String ticketId);
}