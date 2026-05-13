# Documentazione Front-End

## Obiettivo

Il frontend e una SPA React che consuma le API REST del backend e copre i flussi richiesti dal capitolato:

- autenticazione
- dashboard
- lista e dettaglio ticket
- creazione ticket
- profilo utente
- notifiche
- pannello operatore
- gestione utenti admin

## Struttura attuale

Il frontend e stato mantenuto volutamente leggero:

- `src/App.jsx`: orchestrazione principale UI, fetch API, viste applicative
- `src/App.css`: layout e design system base
- `src/index.css`: reset minimo

## Flusso dati

- Il token JWT viene salvato in `localStorage`
- Ogni chiamata API aggiunge automaticamente header `Authorization: Bearer ...`
- All'avvio viene richiesto `GET /api/v1/users/me` per ricostruire la sessione
- La dashboard carica:
  - `GET /api/v1/stats/my`
  - `GET /api/v1/stats/overview` se operatore/admin
  - `GET /api/v1/notifications`
- La sezione ticket carica:
  - lista ticket con filtri
  - dettaglio ticket
  - storico
  - commenti
  - allegati

## Pagine e sezioni

### Login e registrazione

- form login
- form registrazione dipendente
- feedback errori/successo

### Dashboard

- metriche personali
- overview operatore
- notifiche recenti

### Ticket

- filtri per stato, categoria, priorita, reparto
- ricerca testuale
- dettaglio ticket
- allegati caricabili/scaricabili
- thread commenti
- storico cambi stato

### Nuovo ticket

- form completo con categoria, priorita, reparto e tag

### Profilo

- aggiornamento nome, cognome, reparto
- upload foto profilo

### Gestione utenti

- lista utenti
- aggiornamento ruolo per admin

## Variabili ambiente

Vedi [frontend/.env.example](/C:/Users/sette/exhelpdesk/frontend/.env.example).

Variabile usata:

- `VITE_API_BASE`

## Build locale

```bash
cd frontend
npm install
npm run build
```

## Avvio locale

```bash
cd frontend
npm run dev
```

Il frontend si aspetta il backend disponibile su `VITE_API_BASE`.
