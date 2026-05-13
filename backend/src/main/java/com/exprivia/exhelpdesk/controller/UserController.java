package com.exprivia.exhelpdesk.controller;

import com.exprivia.exhelpdesk.dto.UserDto;
import com.exprivia.exhelpdesk.service.StorageService;
import com.exprivia.exhelpdesk.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "Gestione utenti")
public class UserController {

    private final UserService userService;
    private final StorageService storageService;

    @GetMapping("/me")
    @Operation(summary = "Profilo utente corrente")
    public ResponseEntity<UserDto> getMe(Principal principal) {
        return ResponseEntity.ok(userService.getProfile(principal.getName()));
    }

    @PutMapping("/me")
    @Operation(summary = "Modifica profilo")
    public ResponseEntity<UserDto> updateMe(Principal principal, @RequestBody Map<String, String> updates) {
        return ResponseEntity.ok(userService.updateProfile(principal.getName(), updates));
    }

    @PostMapping("/me/avatar")
    @Operation(summary = "Upload foto profilo")
    public ResponseEntity<UserDto> uploadAvatar(Principal principal, @RequestParam("file") MultipartFile file) {
        UserDto user = userService.getProfile(principal.getName());
        String key = storageService.uploadProfileAvatar(user.getId(), file);
        return ResponseEntity.ok(userService.updateAvatar(principal.getName(), key));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_OPERATOR','ROLE_ADMIN')")
    @Operation(summary = "Lista utenti (solo Operatori)")
    public ResponseEntity<Page<UserDto>> listUsers(@RequestParam(required = false) String reparto,
                                                   @RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(userService.listUsers(reparto, page, size));
    }

    @PatchMapping("/{id}/role")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @Operation(summary = "Cambia ruolo utente (solo Admin)")
    public ResponseEntity<UserDto> changeRole(@PathVariable String id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(userService.changeRole(id, body.get("ruolo")));
    }
}
