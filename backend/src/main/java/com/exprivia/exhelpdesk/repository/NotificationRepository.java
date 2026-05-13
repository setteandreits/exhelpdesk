package com.exprivia.exhelpdesk.repository;

import com.exprivia.exhelpdesk.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByDestinatarioIdOrderByDataCreazioneDesc(String userId);
    long countByDestinatarioIdAndLettaFalse(String userId);
}