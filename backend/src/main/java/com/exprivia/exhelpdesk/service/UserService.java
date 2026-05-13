package com.exprivia.exhelpdesk.service;

import com.exprivia.exhelpdesk.dto.UserDto;
import com.exprivia.exhelpdesk.exception.ResourceNotFoundException;
import com.exprivia.exhelpdesk.model.User;
import com.exprivia.exhelpdesk.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final StorageService storageService;

    public User getByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utente non trovato"));
    }

    public UserDto getProfile(String email) {
        return toDto(getByEmail(email));
    }

    public UserDto updateProfile(String email, Map<String, String> updates) {
        User user = getByEmail(email);
        if (updates.containsKey("nome")) user.setNome(updates.get("nome"));
        if (updates.containsKey("cognome")) user.setCognome(updates.get("cognome"));
        if (updates.containsKey("reparto")) user.setReparto(updates.get("reparto"));
        return toDto(userRepository.save(user));
    }

    public Page<UserDto> listUsers(String reparto, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("cognome"));
        Page<User> users = userRepository.findAll(pageable);
        if (reparto == null || reparto.isBlank()) {
            return users.map(this::toDto);
        }
        var filtered = users.getContent().stream()
                .filter(user -> reparto.equalsIgnoreCase(user.getReparto()))
                .map(this::toDto)
                .toList();
        return new PageImpl<>(filtered, pageable, filtered.size());
    }

    public UserDto changeRole(String userId, String nuovoRuolo) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utente non trovato"));
        user.setRuolo(User.Role.valueOf(nuovoRuolo));
        return toDto(userRepository.save(user));
    }

    public UserDto updateAvatar(String email, String url) {
        User user = getByEmail(email);
        user.setFotoProfiloUrl(url);
        return toDto(userRepository.save(user));
    }

    public boolean isOperatorOrAdmin(String email) {
        User.Role role = getByEmail(email).getRuolo();
        return role == User.Role.ROLE_OPERATOR || role == User.Role.ROLE_ADMIN;
    }

    private UserDto toDto(User user) {
        UserDto dto = UserDto.from(user);
        dto.setFotoProfiloUrl(storageService.resolveObjectUrl(user.getFotoProfiloUrl()));
        return dto;
    }
}
