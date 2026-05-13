package com.exprivia.exhelpdesk.config;

import com.exprivia.exhelpdesk.model.User;
import com.exprivia.exhelpdesk.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final S3StartupInitializer s3StartupInitializer;

    @Override
    public void run(String... args) {
        s3StartupInitializer.initializeBucket();
        ensureUser("admin@exprivia.local", "Admin", "Exprivia", "IT", User.Role.ROLE_ADMIN);
        ensureUser("operatore@exprivia.local", "Operatore", "Helpdesk", "IT", User.Role.ROLE_OPERATOR);
        ensureUser("dipendente@exprivia.local", "Mario", "Rossi", "HR", User.Role.ROLE_EMPLOYEE);
    }

    private void ensureUser(String email, String nome, String cognome, String reparto, User.Role role) {
        if (userRepository.existsByEmail(email)) {
            return;
        }
        userRepository.save(User.builder()
                .email(email)
                .nome(nome)
                .cognome(cognome)
                .reparto(reparto)
                .ruolo(role)
                .attivo(true)
                .passwordHash(passwordEncoder.encode("Password123!"))
                .build());
    }
}
