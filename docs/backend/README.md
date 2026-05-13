# Documentazione Back-End

## Scelte architetturali

Il backend usa Spring Boot 3 con approccio a layer:

- `controller`: espone le REST API
- `service`: contiene logica applicativa, autorizzazioni e integrazione S3
- `repository`: persistenza JPA su PostgreSQL
- `model`: entita persistite
- `dto`: contratti scambiati con il frontend
- `security`: filtro JWT e risoluzione utente autenticato

La scelta di PostgreSQL e JPA rende semplice gestire relazioni tra `User`, `Ticket`, `TicketHistory`, `Comment`, `Notification` e `Allegato`.

## Modello dati

### Entita principali

- `User`: anagrafica, ruolo, reparto, avatar
- `Ticket`: titolo, descrizione, categoria, priorita, stato, reparto, richiedente, operatore
- `TicketHistory`: storico cambi stato con nota, utente e timestamp
- `Comment`: thread cronologico con allegato opzionale
- `Notification`: eventi per stato, commenti, assegnazioni
- `Allegato`: metadata file caricati su ticket

## Sicurezza

- Autenticazione JWT con claim `role`
- Password hashate con BCrypt cost factor 12
- Protezione endpoint con `@PreAuthorize` e `anyRequest().authenticated()`
- Endpoint pubblici limitati a auth, health, swagger e ticket pubblici

## Matrice ruoli

- `ROLE_EMPLOYEE`: crea ticket, vede i propri ticket, commenta, aggiorna profilo
- `ROLE_OPERATOR`: vede tutti i ticket, si assegna ticket, cambia stato, legge dashboard overview
- `ROLE_ADMIN`: stesse capacita dell'operatore piu cambio ruolo utenti

## Integrazione S3

Il servizio `StorageService` usa AWS SDK v2 contro LocalStack.

### Convenzioni chiavi

- Ticket attachments: `tickets/{ticketId}/{uuid}_{nomeFile}`
- Avatar: `profiles/{userId}/{uuid}_avatar_{nomeFile}`

### Regole applicate

- Limite massimo file: 10 MB
- MIME consentiti: PDF, JPEG, PNG, GIF, DOC, DOCX
- URL download tramite presigned URL
- Bucket creato automaticamente all'avvio tramite `S3StartupInitializer`

## Variabili d'ambiente

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `JWT_SECRET`
- `JWT_EXPIRATION`
- `AWS_ENDPOINT_OVERRIDE`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_BUCKET_NAME`
- `AWS_PRESIGNED_URL_EXPIRATION_SECONDS`

## Utenti demo creati automaticamente

Password comune: `Password123!`

- `admin@exprivia.local`
- `operatore@exprivia.local`
- `dipendente@exprivia.local`

## Endpoint principali

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET/PUT /api/v1/users/me`
- `POST /api/v1/users/me/avatar`
- `GET /api/v1/users`
- `PATCH /api/v1/users/{id}/role`
- `GET/POST/PUT/DELETE /api/v1/tickets`
- `PATCH /api/v1/tickets/{id}/status`
- `PATCH /api/v1/tickets/{id}/assign`
- `GET/POST/DELETE /api/v1/tickets/{id}/attachments`
- `GET/POST/PUT/DELETE /api/v1/tickets/{id}/comments`
- `GET /api/v1/tickets/{id}/history`
- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/{id}/read`
- `PATCH /api/v1/notifications/read-all`
- `GET /api/v1/stats/overview`
- `GET /api/v1/stats/my`

La documentazione dettagliata e gli schemi request/response sono disponibili in Swagger UI.

## Logging

`RequestLoggingFilter` emette log in formato JSON-like con:

- metodo
- path
- status
- durata in millisecondi

## Test

Per verificare il backend:

```bash
cd backend
./mvnw.cmd test
```
