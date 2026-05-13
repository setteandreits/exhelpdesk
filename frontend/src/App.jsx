import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'

const categories = ['IT', 'HR', 'AMMINISTRAZIONE', 'FACILITY', 'ALTRO']
const priorities = ['BASSA', 'MEDIA', 'ALTA', 'CRITICA']
const statuses = ['APERTO', 'IN_CARICO', 'IN_ATTESA', 'RISOLTO', 'CHIUSO']
const reparti = ['IT', 'HR', 'AMMINISTRAZIONE', 'FACILITY']

const emptyPage = { content: [], totalElements: 0, totalPages: 0, number: 0 }

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('exhelpdesk-token') ?? '')
  const [user, setUser] = useState(null)
  const [view, setView] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [ticketsPage, setTicketsPage] = useState(emptyPage)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [ticketHistory, setTicketHistory] = useState([])
  const [ticketComments, setTicketComments] = useState([])
  const [ticketAttachments, setTicketAttachments] = useState([])
  const [notifications, setNotifications] = useState([])
  const [overviewStats, setOverviewStats] = useState(null)
  const [myStats, setMyStats] = useState(null)
  const [usersPage, setUsersPage] = useState(emptyPage)
  const [filters, setFilters] = useState({ stato: '', categoria: '', priorita: '', reparto: '', q: '' })
  const [createForm, setCreateForm] = useState({
    titolo: '',
    descrizione: '',
    categoria: 'IT',
    priorita: 'MEDIA',
    repartoDestinazione: 'IT',
    tag: '',
  })
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({
    nome: '',
    cognome: '',
    email: '',
    password: '',
    reparto: 'IT',
  })
  const [profileForm, setProfileForm] = useState({ nome: '', cognome: '', reparto: '' })
  const [commentText, setCommentText] = useState('')
  const [commentFile, setCommentFile] = useState(null)
  const [attachmentFile, setAttachmentFile] = useState(null)
  const [createAttachmentFile, setCreateAttachmentFile] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')

  const role = user?.ruolo ?? 'ROLE_EMPLOYEE'
  const isOperator = role === 'ROLE_OPERATOR' || role === 'ROLE_ADMIN'
  const isAdmin = role === 'ROLE_ADMIN'

  const navItems = useMemo(() => {
    const items = [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'tickets', label: 'Ticket' },
      { key: 'create', label: 'Nuovo ticket' },
      { key: 'profile', label: 'Profilo' },
      { key: 'notifications', label: 'Notifiche' },
    ]
    if (isOperator) items.push({ key: 'operations', label: 'Operatore' })
    if (isAdmin || isOperator) items.push({ key: 'users', label: 'Utenti' })
    return items
  }, [isAdmin, isOperator])

  useEffect(() => {
    if (!token) return
    hydrateSession()
  }, [token])

  useEffect(() => {
    if (!token || !user) return
    loadNotifications()
    if (view === 'dashboard') loadDashboard()
    if (view === 'tickets' || view === 'operations') loadTickets()
    if (view === 'users' && (isOperator || isAdmin)) loadUsers()
  }, [token, user, view])

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview('')
      return undefined
    }
    const objectUrl = URL.createObjectURL(avatarFile)
    setAvatarPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [avatarFile])

  async function apiFetch(path, options = {}) {
    let response
    try {
      response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers ?? {}),
        },
      })
    } catch {
      throw new Error('Backend non raggiungibile. Avvia database, LocalStack e backend prima di usare l\'app.')
    }

    if (response.status === 204) return null

    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json') ? await response.json() : await response.text()

    if (!response.ok) {
      throw new Error(data?.message || 'Richiesta non riuscita')
    }

    return data
  }

  async function hydrateSession() {
    try {
      setLoading(true)
      const me = await apiFetch('/api/v1/users/me')
      setUser(me)
      setProfileForm({ nome: me.nome ?? '', cognome: me.cognome ?? '', reparto: me.reparto ?? '' })
      setError('')
    } catch (err) {
      localStorage.removeItem('exhelpdesk-token')
      setToken('')
      setUser(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadDashboard() {
    try {
      setLoading(true)
      const my = await apiFetch('/api/v1/stats/my')
      setMyStats(my)
      if (isOperator) {
        const overview = await apiFetch('/api/v1/stats/overview')
        setOverviewStats(overview)
      } else {
        setOverviewStats(null)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadTickets(nextFilters = filters) {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (nextFilters.stato) params.set('stato', nextFilters.stato)
      if (nextFilters.categoria) params.set('categoria', nextFilters.categoria)
      if (nextFilters.priorita) params.set('priorita', nextFilters.priorita)
      if (nextFilters.reparto) params.set('reparto', nextFilters.reparto)

      const page = nextFilters.q
        ? await apiFetch(`/api/v1/tickets/search?q=${encodeURIComponent(nextFilters.q)}`)
        : await apiFetch(`/api/v1/tickets?${params.toString()}`)
      const normalized = normalizePage(page)
      setTicketsPage(normalized)
      const ticketStillVisible = normalized.content.some((ticket) => ticket.id === selectedTicket?.id)
      if (normalized.content[0] && (!selectedTicket || !ticketStillVisible)) {
        await openTicket(normalized.content[0].id)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function openTicket(ticketId) {
    try {
      setLoading(true)
      const [ticket, history, comments, attachments] = await Promise.all([
        apiFetch(`/api/v1/tickets/${ticketId}`),
        apiFetch(`/api/v1/tickets/${ticketId}/history`),
        apiFetch(`/api/v1/tickets/${ticketId}/comments`),
        apiFetch(`/api/v1/tickets/${ticketId}/attachments`),
      ])
      setSelectedTicket(ticket)
      setTicketHistory(history ?? [])
      setTicketComments(comments ?? [])
      setTicketAttachments(attachments ?? [])
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadNotifications() {
    try {
      const data = await apiFetch('/api/v1/notifications')
      setNotifications(data ?? [])
    } catch (err) {
      setError(err.message)
    }
  }

  async function loadUsers() {
    try {
      setLoading(true)
      const data = await apiFetch('/api/v1/users')
      setUsersPage(normalizePage(data))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault()
    try {
      setLoading(true)
      const path = authMode === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/register'
      const payload =
        authMode === 'login'
          ? { email: authForm.email, password: authForm.password }
          : authForm

      let data
      try {
        data = await fetch(`${API_BASE}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).then(async (response) => {
          const json = await response.json()
          if (!response.ok) throw new Error(json?.message || 'Autenticazione fallita')
          return json
        })
      } catch (err) {
        if (err instanceof TypeError) {
          throw new Error('Backend non raggiungibile. Avvia database, LocalStack e backend prima di usare l\'app.')
        }
        throw err
      }

      localStorage.setItem('exhelpdesk-token', data.token)
      setToken(data.token)
      setMessage(authMode === 'login' ? 'Accesso completato.' : 'Registrazione completata.')
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTicket(event) {
    event.preventDefault()
    try {
      setLoading(true)
      const ticket = await apiFetch('/api/v1/tickets', {
        method: 'POST',
        body: JSON.stringify({
          ...createForm,
          tag: createForm.tag
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      })

      if (createAttachmentFile) {
        const formData = new FormData()
        formData.append('file', createAttachmentFile)
        await apiFetch(`/api/v1/tickets/${ticket.id}/attachments`, {
          method: 'POST',
          body: formData,
        })
      }

      const resetFilters = { stato: '', categoria: '', priorita: '', reparto: '', q: '' }

      setMessage(createAttachmentFile ? 'Ticket e allegato creati con successo.' : 'Ticket creato con successo.')
      setCreateForm({
        titolo: '',
        descrizione: '',
        categoria: 'IT',
        priorita: 'MEDIA',
        repartoDestinazione: 'IT',
        tag: '',
      })
      setCreateAttachmentFile(null)
      setFilters(resetFilters)
      setSelectedTicket(ticket)
      setView('tickets')
      await loadTickets(resetFilters)
      await openTicket(ticket.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleProfileSave(event) {
    event.preventDefault()
    try {
      setLoading(true)
      const updated = await apiFetch('/api/v1/users/me', {
        method: 'PUT',
        body: JSON.stringify(profileForm),
      })

      let nextUser = updated
      if (avatarFile) {
        const formData = new FormData()
        formData.append('file', avatarFile)
        nextUser = await apiFetch('/api/v1/users/me/avatar', { method: 'POST', body: formData })
        setAvatarFile(null)
      }

      setUser(nextUser)
      setMessage('Profilo aggiornato.')
      await hydrateSession()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(nextStatus) {
    if (!selectedTicket) return
    const nota = window.prompt('Inserisci una nota per il cambio stato')
    if (!nota) return

    try {
      setLoading(true)
      await apiFetch(`/api/v1/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ stato: nextStatus, nota }),
      })
      setMessage(`Stato aggiornato a ${nextStatus}.`)
      await openTicket(selectedTicket.id)
      await loadTickets()
      await loadNotifications()
      if (view === 'dashboard') await loadDashboard()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAssignTicket() {
    if (!selectedTicket) return
    try {
      setLoading(true)
      await apiFetch(`/api/v1/tickets/${selectedTicket.id}/assign`, { method: 'PATCH' })
      setMessage('Ticket preso in carico.')
      await openTicket(selectedTicket.id)
      await loadTickets()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddComment(event) {
    event.preventDefault()
    if (!selectedTicket || !commentText.trim()) return
    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('testo', commentText)
      if (commentFile) formData.append('file', commentFile)
      await apiFetch(`/api/v1/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        body: formData,
      })
      setCommentText('')
      setCommentFile(null)
      setMessage('Commento aggiunto.')
      await openTicket(selectedTicket.id)
      await loadNotifications()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUploadAttachment(event) {
    event.preventDefault()
    if (!selectedTicket || !attachmentFile) return
    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('file', attachmentFile)
      await apiFetch(`/api/v1/tickets/${selectedTicket.id}/attachments`, {
        method: 'POST',
        body: formData,
      })
      setAttachmentFile(null)
      setMessage('Allegato caricato.')
      await openTicket(selectedTicket.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteAttachment(attachmentId) {
    if (!selectedTicket) return
    try {
      setLoading(true)
      await apiFetch(`/api/v1/tickets/${selectedTicket.id}/attachments/${attachmentId}`, {
        method: 'DELETE',
      })
      setMessage('Allegato eliminato.')
      await openTicket(selectedTicket.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkAllRead() {
    try {
      await apiFetch('/api/v1/notifications/read-all', { method: 'PATCH' })
      await loadNotifications()
      setMessage('Notifiche aggiornate.')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRoleChange(userId, nextRole) {
    try {
      setLoading(true)
      await apiFetch(`/api/v1/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ ruolo: nextRole }),
      })
      setMessage('Ruolo aggiornato.')
      await loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('exhelpdesk-token')
    setToken('')
    setUser(null)
    setSelectedTicket(null)
    setNotifications([])
    setMessage('Sessione chiusa.')
  }

  if (!token || !user) {
    return (
      <div className="auth-shell">
        <section className="auth-hero">
          <p className="eyebrow">Exprivia Internal Platform</p>
          <h1>ExHelpDesk</h1>
          <p className="hero-copy">
            Dashboard interna per richieste IT, HR, amministrazione e facility con ticket,
            allegati, notifiche e tracciabilita del ciclo di vita.
          </p>
          <div className="hero-points">
            <span>JWT e ruoli</span>
            <span>Storico stati</span>
            <span>Allegati S3</span>
          </div>
        </section>

        <section className="auth-panel">
          <div className="panel-switch">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
              Login
            </button>
            <button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>
              Registrazione
            </button>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === 'register' && (
              <>
                <label>
                  Nome
                  <input value={authForm.nome} onChange={(e) => setAuthForm({ ...authForm, nome: e.target.value })} required />
                </label>
                <label>
                  Cognome
                  <input value={authForm.cognome} onChange={(e) => setAuthForm({ ...authForm, cognome: e.target.value })} required />
                </label>
              </>
            )}

            <label>
              Email
              <input type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} required />
            </label>

            <label>
              Password
              <input type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} required />
            </label>

            {authMode === 'register' && (
              <label>
                Reparto
                <select value={authForm.reparto} onChange={(e) => setAuthForm({ ...authForm, reparto: e.target.value })}>
                  {reparti.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Attendere...' : authMode === 'login' ? 'Accedi' : 'Registrati'}
            </button>
          </form>

          <Feedback message={message} error={error} />
        </section>
      </div>
    )
  }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">HelpDesk interno</p>
          <div className="sidebar-profile">
            <Avatar user={user} />
            <div>
              <h2 className="sidebar-title">ExHelpDesk</h2>
              <p className="sidebar-user">{user.nome} {user.cognome}</p>
              <p className="sidebar-role">{user.ruolo}</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={view === item.key ? 'nav-item active' : 'nav-item'}
              onClick={() => setView(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button className="ghost-button" onClick={logout}>Esci</button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Stato progetto</p>
            <h1>{titleForView(view)}</h1>
          </div>
          <div className="topbar-actions">
            <div className="notification-pill">{notifications.filter((item) => !item.letta).length} non lette</div>
            <button className="secondary-button" onClick={loadNotifications}>Aggiorna</button>
          </div>
        </header>

        <Feedback message={message} error={error} />

        {view === 'dashboard' && (
          <section className="dashboard-grid">
            <Card title="Le mie metriche">
              <StatsGrid stats={myStats?.byStatus ?? {}} />
            </Card>

            <Card title="Notifiche recenti">
              <NotificationList notifications={notifications.slice(0, 6)} />
            </Card>

            {isOperator && (
              <Card title="Visione operatore" wide>
                <div className="stats-columns">
                  <StatsGrid stats={overviewStats?.byStatus ?? {}} />
                  <StatsGrid stats={overviewStats?.byPriority ?? {}} />
                  <StatsGrid stats={overviewStats?.topOpenCategories ?? {}} />
                </div>
              </Card>
            )}
          </section>
        )}

        {(view === 'tickets' || view === 'operations') && (
          <section className="tickets-layout">
            <Card title="Filtro e lista">
              <div className="filter-grid">
                <select value={filters.stato} onChange={(e) => setFilters({ ...filters, stato: e.target.value })}>
                  <option value="">Tutti gli stati</option>
                  {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select value={filters.categoria} onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}>
                  <option value="">Tutte le categorie</option>
                  {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select value={filters.priorita} onChange={(e) => setFilters({ ...filters, priorita: e.target.value })}>
                  <option value="">Tutte le priorita</option>
                  {priorities.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                {isOperator && (
                  <select value={filters.reparto} onChange={(e) => setFilters({ ...filters, reparto: e.target.value })}>
                    <option value="">Tutti i reparti</option>
                    {reparti.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                )}
                <input
                  placeholder="Ricerca per titolo o descrizione"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                />
                <button className="secondary-button" onClick={loadTickets}>Applica</button>
              </div>

              <div className="ticket-list">
                {ticketsPage.content.map((ticket) => (
                  <button
                    key={ticket.id}
                    className={selectedTicket?.id === ticket.id ? 'ticket-row active' : 'ticket-row'}
                    onClick={() => openTicket(ticket.id)}
                  >
                    <div>
                      <strong>{ticket.titolo}</strong>
                      <p>{ticket.descrizione}</p>
                    </div>
                    <div className="ticket-row-meta">
                      <Badge value={ticket.stato} variant="status" />
                      <Badge value={ticket.priorita} variant="priority" />
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            <Card title="Dettaglio ticket" wide>
              {selectedTicket ? (
                <div className="detail-stack">
                  <div className="detail-header">
                    <div>
                      <h3>{selectedTicket.titolo}</h3>
                      <p>{selectedTicket.descrizione}</p>
                    </div>
                    <div className="detail-badges">
                      <Badge value={selectedTicket.stato} variant="status" />
                      <Badge value={selectedTicket.priorita} variant="priority" />
                    </div>
                  </div>

                  <div className="mini-grid">
                    <Info label="Categoria" value={selectedTicket.categoria} />
                    <Info label="Reparto" value={selectedTicket.repartoDestinazione} />
                    <Info label="Richiedente" value={`${selectedTicket.richiedente?.nome ?? ''} ${selectedTicket.richiedente?.cognome ?? ''}`} />
                    <Info label="Operatore" value={selectedTicket.operatore?.email ?? 'Non assegnato'} />
                  </div>

                  {isOperator && (
                    <div className="action-row">
                      <button className="secondary-button" onClick={handleAssignTicket}>Prendi in carico</button>
                      {statuses.map((status) => (
                        <button key={status} className="ghost-button small" onClick={() => handleStatusChange(status)}>
                          {status}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="detail-columns">
                    <section>
                      <h4>Allegati</h4>
                      <form className="inline-form" onSubmit={handleUploadAttachment}>
                        <input type="file" onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)} />
                        <button className="secondary-button" type="submit">Carica</button>
                      </form>
                      <div className="list-stack">
                        {ticketAttachments.map((attachment) => (
                          <div key={attachment.id} className="list-item">
                            <a href={attachment.url} target="_blank" rel="noreferrer">{attachment.nomeFile}</a>
                            <button className="ghost-button small" onClick={() => handleDeleteAttachment(attachment.id)}>
                              Elimina
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h4>Storico stati</h4>
                      <div className="list-stack">
                        {ticketHistory.map((item) => (
                          <div key={item.id} className="timeline-item">
                            <strong>{item.statoNuovo}</strong>
                            <p>{item.nota}</p>
                            <span>{formatDate(item.timestamp)}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <section>
                    <h4>Commenti</h4>
                    <form className="comment-form" onSubmit={handleAddComment}>
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Scrivi un aggiornamento operativo"
                      />
                      <div className="inline-form">
                        <input type="file" onChange={(e) => setCommentFile(e.target.files?.[0] ?? null)} />
                        <button className="primary-button" type="submit">Aggiungi commento</button>
                      </div>
                    </form>
                    <div className="list-stack">
                      {ticketComments.map((comment) => (
                        <article key={comment.id} className="comment-card">
                          <div className="comment-top">
                            <strong>{comment.autore?.nome} {comment.autore?.cognome}</strong>
                            <span>{formatDate(comment.dataCreazione)}</span>
                          </div>
                          <p>{comment.testo}</p>
                          {comment.allegato?.url && (
                            <a href={comment.allegato.url} target="_blank" rel="noreferrer">
                              {comment.allegato.nomeFile}
                            </a>
                          )}
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              ) : (
                <EmptyState text="Seleziona un ticket per vedere dettaglio, allegati e commenti." />
              )}
            </Card>
          </section>
        )}

        {view === 'create' && (
          <Card title="Apri nuova richiesta" wide>
            <form className="form-grid" onSubmit={handleCreateTicket}>
              <label>
                Titolo
                <input value={createForm.titolo} onChange={(e) => setCreateForm({ ...createForm, titolo: e.target.value })} required />
              </label>
              <label>
                Categoria
                <select value={createForm.categoria} onChange={(e) => setCreateForm({ ...createForm, categoria: e.target.value })}>
                  {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>
                Priorita
                <select value={createForm.priorita} onChange={(e) => setCreateForm({ ...createForm, priorita: e.target.value })}>
                  {priorities.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>
                Reparto destinazione
                <select value={createForm.repartoDestinazione} onChange={(e) => setCreateForm({ ...createForm, repartoDestinazione: e.target.value })}>
                  {reparti.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="full">
                Descrizione
                <textarea value={createForm.descrizione} onChange={(e) => setCreateForm({ ...createForm, descrizione: e.target.value })} required />
              </label>
              <label className="full">
                Tag separati da virgola
                <input value={createForm.tag} onChange={(e) => setCreateForm({ ...createForm, tag: e.target.value })} />
              </label>
              <label className="full">
                Allegato iniziale
                <input type="file" onChange={(e) => setCreateAttachmentFile(e.target.files?.[0] ?? null)} />
              </label>
              <button className="primary-button" type="submit">Crea ticket</button>
            </form>
          </Card>
        )}

        {view === 'profile' && (
          <Card title="Profilo utente" wide>
            <form className="form-grid" onSubmit={handleProfileSave}>
              <div className="profile-avatar-panel full">
                <Avatar user={{ ...user, fotoProfiloUrl: avatarPreview || user?.fotoProfiloUrl }} large />
                <div>
                  <strong>Anteprima profilo</strong>
                  <p className="helper-text">
                    Carica una foto JPG, PNG, GIF o PDF fino a 10 MB. Dopo il salvataggio verra mostrata anche nella barra laterale.
                  </p>
                </div>
              </div>
              <label>
                Nome
                <input value={profileForm.nome} onChange={(e) => setProfileForm({ ...profileForm, nome: e.target.value })} />
              </label>
              <label>
                Cognome
                <input value={profileForm.cognome} onChange={(e) => setProfileForm({ ...profileForm, cognome: e.target.value })} />
              </label>
              <label>
                Reparto
                <select value={profileForm.reparto} onChange={(e) => setProfileForm({ ...profileForm, reparto: e.target.value })}>
                  {reparti.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>
                Foto profilo
                <input type="file" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} />
              </label>
              <button className="primary-button" type="submit">Salva profilo</button>
            </form>
          </Card>
        )}

        {view === 'notifications' && (
          <Card title="Centro notifiche" wide>
            <div className="action-row">
              <button className="secondary-button" onClick={handleMarkAllRead}>Segna tutte come lette</button>
            </div>
            <NotificationList notifications={notifications} expanded />
          </Card>
        )}

        {view === 'users' && (
          <Card title="Gestione utenti" wide>
            <div className="list-stack">
              {usersPage.content.map((item) => (
                <div key={item.id} className="list-item user-row">
                  <div>
                    <strong>{item.nome} {item.cognome}</strong>
                    <p>{item.email}</p>
                  </div>
                  <div className="inline-form">
                    <Badge value={item.ruolo} variant="role" />
                    {isAdmin && (
                      <select value={item.ruolo} onChange={(e) => handleRoleChange(item.id, e.target.value)}>
                        <option value="ROLE_EMPLOYEE">ROLE_EMPLOYEE</option>
                        <option value="ROLE_OPERATOR">ROLE_OPERATOR</option>
                        <option value="ROLE_ADMIN">ROLE_ADMIN</option>
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}

function Feedback({ message, error }) {
  if (!message && !error) return null
  return (
    <div className="feedback-stack">
      {message && <div className="feedback success">{message}</div>}
      {error && <div className="feedback error">{error}</div>}
    </div>
  )
}

function Card({ title, children, wide = false }) {
  return (
    <section className={wide ? 'card card-wide' : 'card'}>
      <div className="card-head">
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  )
}

function StatsGrid({ stats }) {
  const entries = Object.entries(stats)
  if (!entries.length) return <EmptyState text="Nessun dato disponibile per ora." />
  return (
    <div className="stats-grid">
      {entries.map(([label, value]) => (
        <div key={label} className="stat-tile">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

function NotificationList({ notifications, expanded = false }) {
  if (!notifications.length) return <EmptyState text="Nessuna notifica disponibile." />
  return (
    <div className={expanded ? 'list-stack expanded' : 'list-stack'}>
      {notifications.map((notification) => (
        <div key={notification.id} className="list-item notification-row">
          <div>
            <strong>{notification.tipo}</strong>
            <p>{notification.messaggio}</p>
          </div>
          <span>{formatDate(notification.dataCreazione)}</span>
        </div>
      ))}
    </div>
  )
}

function Badge({ value, variant }) {
  return <span className={`badge ${variant}`}>{value}</span>
}

function Avatar({ user, large = false }) {
  const initials = `${user?.nome?.[0] ?? ''}${user?.cognome?.[0] ?? ''}`.toUpperCase() || 'EH'
  if (user?.fotoProfiloUrl) {
    return <img className={large ? 'avatar avatar-large' : 'avatar'} src={user.fotoProfiloUrl} alt={`Avatar di ${user?.nome ?? 'utente'}`} />
  }
  return <div className={large ? 'avatar avatar-large avatar-fallback' : 'avatar avatar-fallback'}>{initials}</div>
}

function Info({ label, value }) {
  return (
    <div className="info-block">
      <span>{label}</span>
      <strong>{value || 'N/D'}</strong>
    </div>
  )
}

function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>
}

function normalizePage(page) {
  if (!page) return emptyPage
  if (Array.isArray(page)) {
    return { ...emptyPage, content: page, totalElements: page.length }
  }
  return {
    content: page.content ?? [],
    totalElements: page.totalElements ?? page.content?.length ?? 0,
    totalPages: page.totalPages ?? 1,
    number: page.number ?? 0,
  }
}

function titleForView(view) {
  if (view === 'dashboard') return 'Dashboard operativa'
  if (view === 'tickets') return 'Ticket e dettaglio'
  if (view === 'create') return 'Nuova richiesta'
  if (view === 'profile') return 'Profilo personale'
  if (view === 'notifications') return 'Notifiche'
  if (view === 'operations') return 'Pannello operatore'
  if (view === 'users') return 'Gestione utenti'
  return 'ExHelpDesk'
}

function formatDate(value) {
  if (!value) return 'N/D'
  return new Date(value).toLocaleString('it-IT')
}

export default App
