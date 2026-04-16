# ExHelpDesk

Internal Helpdesk & Request Management System — Exprivia S.p.A.

## Stack
- **Backend:** Spring Boot 3.x (Java 17)
- **Database:** PostgreSQL 15
- **Storage:** LocalStack S3
- **Frontend:** React 18 + Vite + TypeScript

## Avvio rapido

git clone https://github.com/TUO_USERNAME/exhelpdesk.git
cd exhelpdesk
docker compose up

- Frontend:  http://localhost:3000
- Backend:   http://localhost:8080
- Swagger:   http://localhost:8080/swagger-ui/index.html

## Struttura repository

exhelpdesk/
├── backend/        # Spring Boot
├── frontend/       # React App
├── docs/
│   ├── backend/    # Architettura, ER, JWT flow
│   └── frontend/   # Componenti, state, env
├── docker/         # localstack-init.sh
└── docker-compose.yml