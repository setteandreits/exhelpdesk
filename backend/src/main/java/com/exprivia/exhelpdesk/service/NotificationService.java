package com.exprivia.exhelpdesk.service;

import com.exprivia.exhelpdesk.dto.NotificationDto;
import com.exprivia.exhelpdesk.exception.ResourceNotFoundException;
import com.exprivia.exhelpdesk.model.Notification;
import com.exprivia.exhelpdesk.model.User;
import com.exprivia.exhelpdesk.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserService userService;

    public List<NotificationDto> getMyNotifications(String email) {
        String userId = userService.getByEmail(email).getId();
        return notificationRepository.findByDestinatarioIdOrderByDataCreazioneDesc(userId).stream()
                .map(NotificationDto::from)
                .toList();
    }

    public long countUnread(String email) {
        String userId = userService.getByEmail(email).getId();
        return notificationRepository.countByDestinatarioIdAndLettaFalse(userId);
    }

    @Transactional
    public void markRead(String notifId, String email) {
        Notification notification = notificationRepository.findById(notifId)
                .orElseThrow(() -> new ResourceNotFoundException("Notifica non trovata"));
        User user = userService.getByEmail(email);
        if (!notification.getDestinatario().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Non autorizzato a modificare questa notifica");
        }
        notification.setLetta(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllRead(String email) {
        String userId = userService.getByEmail(email).getId();
        List<Notification> notifications = notificationRepository.findByDestinatarioIdOrderByDataCreazioneDesc(userId);
        notifications.forEach(notification -> notification.setLetta(true));
        notificationRepository.saveAll(notifications);
    }
}
