package com.exprivia.exhelpdesk.repository;

import com.exprivia.exhelpdesk.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, String> {
    List<Comment> findByTicketIdAndEliminatoFalseOrderByDataCreazioneAsc(String ticketId);
}