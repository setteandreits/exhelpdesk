package com.exprivia.exhelpdesk.service;

import com.exprivia.exhelpdesk.dto.*;
import com.exprivia.exhelpdesk.model.User;
import com.exprivia.exhelpdesk.repository.UserRepository;
import com.exprivia.exhelpdesk.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.getEmail()))
            throw new IllegalArgumentException("Email già registrata");

        User.Role role = "ROLE_ADMIN".equals(req.getRuolo())
                ? User.Role.ROLE_ADMIN
                : User.Role.ROLE_EMPLOYEE;

        User user = User.builder()
                .nome(req.getNome())
                .cognome(req.getCognome())
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .ruolo(role)
                .reparto(req.getReparto())
                .attivo(true)
                .build();

        userRepository.save(user);
        String token = jwtUtil.generateToken(user.getEmail(), user.getRuolo().name());
        return new AuthResponse(token, user.getId(), user.getEmail(),
                user.getNome(), user.getCognome(), user.getRuolo().name());
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Credenziali non valide"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash()))
            throw new IllegalArgumentException("Credenziali non valide");

        if (!user.isAttivo())
            throw new IllegalArgumentException("Account disabilitato");

        String token = jwtUtil.generateToken(user.getEmail(), user.getRuolo().name());
        return new AuthResponse(token, user.getId(), user.getEmail(),
                user.getNome(), user.getCognome(), user.getRuolo().name());
    }
}
