# ExHelpDesk

Sistema interno di gestione richieste aziendali per Exprivia S.p.A. Il progetto implementa un helpdesk web con autenticazione JWT, ruoli applicativi, ticketing, allegati su S3 simulato con LocalStack, notifiche interne e dashboard operativa.

## Funzionalita principali

- Registrazione e login con JWT
- Ruoli `ROLE_EMPLOYEE`, `ROLE_OPERATOR`, `ROLE_ADMIN`
- Creazione, modifica, assegnazione e cambio stato ticket
- Storico stati con nota obbligatoria
- Commenti ticket con allegato opzionale
- Upload allegati ticket e avatar utente su LocalStack S3
- Notifiche interne e contatore non lette
- Dashboard con statistiche personali e operative
- Frontend React responsive con viste per dipendente, operatore e admin
- Swagger UI esposta a runtime

## Stack

- Backend: Spring Boot 3.3, Java 17, Spring Security, Spring Data JPA
- Database: PostgreSQL 15
- Object Storage: LocalStack S3
- Frontend: React + Vite
- Containerizzazione: Docker e Docker Compose

## Avvio rapido

### Prerequisiti

- Docker Desktop con Docker Compose

### Avvio

```bash
git clone <repo-url>
cd exhelpdesk
docker compose up --build
```

### URL utili

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8080](http://localhost:8080)
- Swagger UI: [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)
- Actuator health: [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health)

## Credenziali demo

Tutti gli utenti demo hanno password `Password123!`.

- Admin: `admin@exprivia.local`
- Operatore: `operatore@exprivia.local`
- Dipendente: `dipendente@exprivia.local`

## Struttura repository

```text
exhelpdesk/
├── backend/          # API Spring Boot, sicurezza, logica ticket, integrazione S3
├── frontend/         # SPA React per dashboard, ticket, profilo e notifiche
├── docs/
│   ├── backend/      # Architettura, sicurezza, variabili, S3
│   └── frontend/     # Struttura UI, flusso dati e configurazioni
├── docker/           # Script init LocalStack
├── docker-compose.yml
└── README.md
```

## Variabili d'ambiente principali

### Backend

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `AWS_ENDPOINT_OVERRIDE`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_BUCKET_NAME`
- `JWT_SECRET`
- `JWT_EXPIRATION`

### Frontend

- `VITE_API_BASE`

Vedi anche [frontend/.env.example](/C:/Users/sette/exhelpdesk/frontend/.env.example).

## Flussi principali da mostrare in demo

1. Login come dipendente e creazione ticket
2. Upload allegato e inserimento commento
3. Login come operatore, presa in carico e cambio stato
4. Visualizzazione dashboard e notifiche
5. Login admin e cambio ruolo utente

## Documentazione tecnica

- Backend: [docs/backend/README.md](/C:/Users/sette/exhelpdesk/docs/backend/README.md)
- Frontend: [docs/frontend/README.md](/C:/Users/sette/exhelpdesk/docs/frontend/README.md)

## Verifiche eseguite

- `backend`: `./mvnw.cmd test`
- `frontend`: `npm run build`
