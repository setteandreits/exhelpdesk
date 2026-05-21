import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'

const categories = ['IT', 'HR', 'AMMINISTRAZIONE', 'FACILITY', 'ALTRO']
const priorities = ['BASSA', 'MEDIA', 'ALTA', 'CRITICA']
const statuses = ['APERTO', 'IN_CARICO', 'IN_ATTESA', 'RISOLTO', 'CHIUSO']
const openStatuses = ['APERTO', 'IN_CARICO', 'IN_ATTESA']
const closedStatuses = ['RISOLTO', 'CHIUSO']
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
  const [ticketScope, setTicketScope] = useState('open')
  const [createForm, setCreateForm] = useState({
    titolo: '',
    descrizione: '',
    categoria: 'IT',
    priorita: 'MEDIA',
    repartoDestinazione: 'IT',
    tag: '',
  })
  const [authMode, setAuthMode] = useState('login')
  const [authRole, setAuthRole] = useState('employee')
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
  const avatarPreview = useMemo(() => (avatarFile ? URL.createObjectURL(avatarFile) : ''), [avatarFile])

  const role = user?.ruolo ?? 'ROLE_EMPLOYEE'
  const isOperator = role === 'ROLE_OPERATOR' || role === 'ROLE_ADMIN'
  const isAdmin = role === 'ROLE_ADMIN'
  const selectedTicketClosed = selectedTicket?.stato === 'CHIUSO' || selectedTicket?.stato === 'RISOLTO'

  const navItems = useMemo(() => {
    if (isOperator) {
      return [
        { key: 'dashboard', label: isAdmin ? 'Dashboard admin' : 'Dashboard operatore' },
        { key: 'operations', label: 'Ticket utenti' },
        { key: 'tickets', label: 'Tutti i ticket' },
        { key: 'users', label: 'Utenti' },
        { key: 'profile', label: 'Profilo' },
        { key: 'notifications', label: 'Notifiche' },
      ]
    }

    return [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'tickets', label: 'I miei ticket' },
      { key: 'create', label: 'Nuovo ticket' },
      { key: 'profile', label: 'Profilo' },
      { key: 'notifications', label: 'Notifiche' },
    ]
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
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

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
    let data = null
    if (contentType.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    if (!response.ok) {
      const serverMessage = typeof data === 'string' ? data : data?.message
      throw new Error(serverMessage || `Richiesta non riuscita (${response.status})`)
    }

    return data
  }

  async function hydrateSession() {
    try {
      setLoading(true)
      const me = await apiFetch('/api/v1/users/me')
      const nextUser = {
        ...me,
        fotoProfiloUrl: readCachedAvatar(me.email) || me.fotoProfiloUrl,
      }
      setUser(nextUser)
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

  async function loadTickets(nextFilters = filters, nextScope = ticketScope) {
    try {
      setLoading(true)
      setError('')
      const page = await fetchTicketsPage(nextFilters, nextScope)
      const normalized = normalizePage(page)
      setTicketsPage(normalized)
      const ticketStillVisible = normalized.content.some((ticket) => ticket.id === selectedTicket?.id)
      if (normalized.content[0] && (!selectedTicket || !ticketStillVisible)) {
        await openTicket(normalized.content[0].id, { quiet: true })
      }
      if (!normalized.content.length) {
        setSelectedTicket(null)
        setTicketHistory([])
        setTicketComments([])
        setTicketAttachments([])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchTicketsPage(nextFilters, nextScope) {
    let sourceTickets = []
    try {
      const page = await apiFetch('/api/v1/tickets')
      sourceTickets = mergeTicketLists(normalizePage(page).content, getFallbackTickets(user, isOperator))
      writeCachedTickets(user?.email, sourceTickets)
      writeGlobalCachedTickets(sourceTickets)
    } catch {
      sourceTickets = getFallbackTickets(user, isOperator)
    }

    const scopedStatuses = nextScope === 'closed' ? closedStatuses : openStatuses
    const query = nextFilters.q.trim().toLowerCase()
    const mergedContent = sourceTickets
      .filter((ticket) => {
        const statusMatch = nextFilters.stato
          ? ticket.stato === nextFilters.stato
          : scopedStatuses.includes(ticket.stato)
        const categoryMatch = !nextFilters.categoria || ticket.categoria === nextFilters.categoria
        const priorityMatch = !nextFilters.priorita || ticket.priorita === nextFilters.priorita
        const repartoMatch = !nextFilters.reparto || ticket.repartoDestinazione === nextFilters.reparto
        return statusMatch && categoryMatch && priorityMatch && repartoMatch
      })
      .filter((ticket) => {
        if (!query) return true
        return `${ticket.titolo ?? ''} ${ticket.descrizione ?? ''}`.toLowerCase().includes(query)
      })
      .sort((a, b) => new Date(b.dataApertura ?? 0) - new Date(a.dataApertura ?? 0))

    return {
      ...emptyPage,
      content: mergedContent,
      totalElements: mergedContent.length,
      totalPages: mergedContent.length ? 1 : 0,
    }
  }

  async function openTicket(ticketId, options = {}) {
    try {
      setLoading(true)
      const ticket = await apiFetch(`/api/v1/tickets/${ticketId}`)
      const [historyResult, commentsResult, attachmentsResult] = await Promise.allSettled([
        apiFetch(`/api/v1/tickets/${ticketId}/history`),
        apiFetch(`/api/v1/tickets/${ticketId}/comments`),
        apiFetch(`/api/v1/tickets/${ticketId}/attachments`),
      ])
      setSelectedTicket(ticket)
      setTicketHistory(historyResult.status === 'fulfilled' ? historyResult.value ?? [] : [])
      setTicketComments(commentsResult.status === 'fulfilled' ? commentsResult.value ?? [] : [])
      setTicketAttachments(attachmentsResult.status === 'fulfilled' ? attachmentsResult.value ?? [] : [])
      setError('')
    } catch (err) {
      const fallbackTicket = getFallbackTickets(user, isOperator).find((item) => item.id === ticketId)
      if (fallbackTicket) {
        setSelectedTicket(fallbackTicket)
        setTicketHistory([])
        setTicketComments([])
        setTicketAttachments([])
        setError('')
      } else if (!options.quiet) {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadNotifications() {
    try {
      const data = await apiFetch('/api/v1/notifications')
      setNotifications(data ?? [])
    } catch {
      setNotifications([])
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
          : { ...authForm, ruolo: authRole === 'staff' ? 'ROLE_ADMIN' : 'ROLE_EMPLOYEE' }

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

      const loggedRole = data.ruolo ?? 'ROLE_EMPLOYEE'
      const staffLogin = loggedRole === 'ROLE_OPERATOR' || loggedRole === 'ROLE_ADMIN'
      if (authRole === 'staff' && !staffLogin) {
        throw new Error('Questo accesso e riservato ad amministratori e operatori.')
      }
      if (authRole === 'employee' && staffLogin) {
        throw new Error('Per questo account usa Accesso amministratore/operatore.')
      }

      localStorage.setItem('exhelpdesk-token', data.token)
      setToken(data.token)
      setView('dashboard')
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
    const payload = {
      ...createForm,
      titolo: createForm.titolo.trim(),
      descrizione: createForm.descrizione.trim(),
      tag: createForm.tag
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    }

    if (!payload.titolo || !payload.descrizione) {
      setMessage('')
      setError('Inserisci titolo e descrizione prima di creare il ticket.')
      return
    }

    try {
      setLoading(true)
      setMessage('')
      setError('')
      const ticket = await apiFetch('/api/v1/tickets', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const cachedTicket = { ...ticket, richiedente: ticket.richiedente ?? user }
      upsertCachedTicket(user?.email, cachedTicket)
      upsertGlobalCachedTicket(cachedTicket)

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
      setTicketScope('open')
      setSelectedTicket(cachedTicket)
      setView('tickets')
      await loadTickets(resetFilters, 'open')
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
        const localAvatar = await fileToDataUrl(avatarFile)
        cacheAvatar(user?.email, localAvatar)
        const formData = new FormData()
        formData.append('file', avatarFile)
        try {
          nextUser = await apiFetch('/api/v1/users/me/avatar', { method: 'POST', body: formData })
        } catch {
          nextUser = updated
        }
        nextUser = {
          ...nextUser,
          fotoProfiloUrl: localAvatar || withCacheToken(nextUser.fotoProfiloUrl),
        }
        setAvatarFile(null)
      }

      setUser(nextUser)
      setProfileForm({ nome: nextUser.nome ?? '', cognome: nextUser.cognome ?? '', reparto: nextUser.reparto ?? '' })
      setMessage('Profilo aggiornato.')
      setError('')
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

  async function handleQuickStatus(nextStatus) {
    if (!selectedTicket) return
    const noteByStatus = {
      APERTO: 'Ticket riaperto dal richiedente',
      CHIUSO: 'Ticket chiuso dal richiedente',
    }
    const updatedTicket = {
      ...selectedTicket,
      stato: nextStatus,
      dataChiusura: nextStatus === 'CHIUSO' ? new Date().toISOString() : null,
    }
    const nextScope = nextStatus === 'CHIUSO' ? 'closed' : 'open'

    try {
      setLoading(true)
      setError('')
      setSelectedTicket(updatedTicket)
      upsertCachedTicket(user?.email, updatedTicket)
      upsertCachedTicket(updatedTicket.richiedente?.email, updatedTicket)
      upsertGlobalCachedTicket(updatedTicket)
      setTicketScope(nextScope)
      setMessage(nextStatus === 'CHIUSO' ? 'Ticket chiuso.' : 'Ticket riaperto.')

      const savedTicket = await apiFetch(`/api/v1/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ stato: nextStatus, nota: noteByStatus[nextStatus] ?? 'Aggiornamento stato' }),
      })
      upsertCachedTicket(user?.email, savedTicket)
      upsertCachedTicket(savedTicket.richiedente?.email, savedTicket)
      upsertGlobalCachedTicket(savedTicket)
      setSelectedTicket(savedTicket)
      await loadTickets(filters, nextScope)
      await loadDashboard()
    } catch {
      await loadTickets(filters, nextScope)
      setError('')
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
          <div className="access-switch">
            <button
              className={authRole === 'employee' ? 'active' : ''}
              onClick={() => {
                setAuthRole('employee')
                setAuthMode('login')
              }}
            >
              <span>Utente</span>
              <strong>Dipendente</strong>
              <small>Apre ticket e segue le proprie richieste</small>
            </button>
            <button
              className={authRole === 'staff' ? 'active' : ''}
              onClick={() => {
                setAuthRole('staff')
              }}
            >
              <span>Admin</span>
              <strong>Operatore / Admin</strong>
              <small>Vede i ticket degli utenti e li gestisce</small>
            </button>
          </div>

          <div className="auth-context">
            <p className="eyebrow">{authRole === 'staff' ? 'Area amministrazione' : authMode === 'register' ? 'Nuovo utente normale' : 'Accesso utente'}</p>
            <h2>
              {authRole === 'staff'
                ? authMode === 'register' ? 'Crea account amministratore' : 'Entra come amministratore'
                : authMode === 'register' ? 'Crea account dipendente' : 'Entra come utente'}
            </h2>
            <p>
              {authRole === 'staff'
                ? authMode === 'register'
                  ? 'La registrazione crea un amministratore che puo vedere i ticket degli utenti, gestire stati e consultare gli account.'
                  : 'Operatori e admin possono vedere i ticket aperti dagli utenti normali, prenderli in carico e aggiornarne lo stato.'
                : authMode === 'register'
                  ? 'La registrazione crea un utente normale che puo aprire ticket, seguire lo stato e gestire il proprio profilo.'
                  : 'Gli utenti normali possono aprire ticket, vedere solo le proprie richieste e chiuderle quando risolte.'}
            </p>
          </div>

          <div className="panel-switch">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
              Login
            </button>
            <button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>
              {authRole === 'staff' ? 'Crea admin' : 'Registrazione'}
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
            <h1>{titleForView(view, isOperator, isAdmin)}</h1>
          </div>
          <div className="topbar-actions">
            <div className="notification-pill">{notifications.filter((item) => !item.letta).length} non lette</div>
            <button className="secondary-button" onClick={loadNotifications}>Aggiorna</button>
          </div>
        </header>

        <Feedback message={message} error={error} />

        {view === 'dashboard' && (
          <section className="dashboard-grid">
            <Card title={isOperator ? 'Area amministratore' : 'Area dipendente'} wide>
              <div className="role-home-panel">
                <div>
                  <p className="eyebrow">{isOperator ? 'Vista gestione' : 'Vista personale'}</p>
                  <h3>{isOperator ? 'Controlla le richieste degli utenti' : 'Apri e segui i tuoi ticket'}</h3>
                </div>
                <p>
                  {isOperator
                    ? 'Qui vedi la coda completa dei ticket creati dai dipendenti, puoi aprire quelli in attesa, chiuderli e consultare gli utenti registrati.'
                    : 'Qui trovi solo i tuoi ticket, le notifiche e il pulsante per aprire una nuova richiesta al reparto giusto.'}
                </p>
              </div>
            </Card>

            <Card title="Le mie metriche">
              <StatsGrid stats={myStats?.byStatus ?? {}} />
            </Card>

            <Card title={isOperator ? 'Funzioni operatore' : 'Funzioni utente'}>
              <RoleActions
                isOperator={isOperator}
                isAdmin={isAdmin}
                onCreate={() => setView('create')}
                onTickets={() => setView('tickets')}
                onOperations={() => {
                  setFilters({ stato: '', categoria: '', priorita: '', reparto: '', q: '' })
                  setTicketScope('open')
                  setView('operations')
                }}
                onUsers={() => setView('users')}
              />
            </Card>

            <Card title="Notifiche recenti">
              <NotificationList notifications={notifications.slice(0, 6)} />
            </Card>

            {isOperator && (
              <Card title="Coda ticket utenti">
                <div className="admin-ticket-panel">
                  <p>
                    Accesso rapido alle richieste create dagli utenti normali. Puoi passare
                    dagli aperti ai chiusi e poi usare i filtri di reparto, categoria e priorita.
                  </p>
                  <div className="action-row">
                    <button
                      className="primary-button"
                      onClick={() => {
                        setFilters({ stato: '', categoria: '', priorita: '', reparto: '', q: '' })
                        setTicketScope('open')
                        setView('operations')
                      }}
                    >
                      Vedi ticket aperti
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setFilters({ stato: '', categoria: '', priorita: '', reparto: '', q: '' })
                        setTicketScope('closed')
                        setView('operations')
                      }}
                    >
                      Vedi ticket chiusi
                    </button>
                  </div>
                </div>
              </Card>
            )}

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
              <div className="scope-tabs" aria-label="Vista ticket">
                <button
                  className={ticketScope === 'open' ? 'active' : ''}
                  onClick={() => {
                    setTicketScope('open')
                    setFilters({ ...filters, stato: '' })
                    loadTickets({ ...filters, stato: '' }, 'open')
                  }}
                >
                  Ticket aperti
                </button>
                <button
                  className={ticketScope === 'closed' ? 'active' : ''}
                  onClick={() => {
                    setTicketScope('closed')
                    setFilters({ ...filters, stato: '' })
                    loadTickets({ ...filters, stato: '' }, 'closed')
                  }}
                >
                  Ticket chiusi
                </button>
              </div>
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
                <button className="secondary-button" onClick={() => loadTickets(filters, ticketScope)} disabled={loading}>Applica</button>
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
                {!ticketsPage.content.length && (
                  <EmptyState text="Nessun ticket trovato con questi filtri." />
                )}
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

                  <div className="ticket-toolbar">
                    <div>
                      <span>Gestione stato</span>
                      <strong>{selectedTicketClosed ? 'Ticket chiuso' : 'Ticket aperto'}</strong>
                    </div>
                    {selectedTicketClosed ? (
                      <button className="secondary-button" onClick={() => handleQuickStatus('APERTO')} disabled={loading}>
                        Riapri ticket
                      </button>
                    ) : (
                      <button className="danger-button" onClick={() => handleQuickStatus('CHIUSO')} disabled={loading}>
                        Chiudi ticket
                      </button>
                    )}
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
            <div className="request-intro">
              <div>
                <p className="eyebrow">Workflow ticketing</p>
                <h3>Racconta il problema in modo chiaro</h3>
              </div>
              <p>
                Il ticket verra assegnato al reparto scelto e potrai seguirne stato,
                allegati e commenti nella sezione Ticket.
              </p>
            </div>
            <form className="form-grid" onSubmit={handleCreateTicket}>
              <label>
                Titolo
                <input
                  value={createForm.titolo}
                  onChange={(e) => setCreateForm({ ...createForm, titolo: e.target.value })}
                  placeholder="Es. Accesso VPN non funzionante"
                  maxLength={120}
                  required
                />
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
                <textarea
                  value={createForm.descrizione}
                  onChange={(e) => setCreateForm({ ...createForm, descrizione: e.target.value })}
                  placeholder="Descrivi cosa succede, da quando e quali passaggi hai gia provato."
                  required
                />
              </label>
              <label className="full">
                Tag separati da virgola
                <input
                  value={createForm.tag}
                  onChange={(e) => setCreateForm({ ...createForm, tag: e.target.value })}
                  placeholder="vpn, accesso, urgente"
                />
              </label>
              <label className="full">
                Allegato iniziale
                <input type="file" onChange={(e) => setCreateAttachmentFile(e.target.files?.[0] ?? null)} />
              </label>
              <button className="primary-button" type="submit" disabled={loading}>
                {loading ? 'Creazione in corso...' : 'Crea ticket'}
              </button>
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
                <input accept="image/*" type="file" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} />
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

function RoleActions({ isOperator, isAdmin, onCreate, onTickets, onOperations, onUsers }) {
  if (isOperator) {
    return (
      <div className="role-actions">
        <button className="role-action" onClick={onOperations}>
          <span>Operatore</span>
          <strong>Prendi in carico e cambia stato</strong>
        </button>
        <button className="role-action" onClick={onTickets}>
          <span>Ticket</span>
          <strong>Consulta richieste e dettagli</strong>
        </button>
        <button className="role-action" onClick={onUsers}>
          <span>{isAdmin ? 'Admin' : 'Utenti'}</span>
          <strong>{isAdmin ? 'Gestisci ruoli utente' : 'Consulta utenti registrati'}</strong>
        </button>
      </div>
    )
  }

  return (
    <div className="role-actions">
      <button className="role-action" onClick={onCreate}>
        <span>Nuova richiesta</span>
        <strong>Apri un ticket</strong>
      </button>
      <button className="role-action" onClick={onTickets}>
        <span>I miei ticket</span>
        <strong>Vedi aperti e chiusi</strong>
      </button>
      <button className="role-action" onClick={onTickets}>
        <span>Stato richiesta</span>
        <strong>Chiudi o riapri un ticket</strong>
      </button>
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
  return <span className={`badge ${variant} ${String(value ?? '').toLowerCase()}`}>{value}</span>
}

function Avatar({ user, large = false }) {
  const [imageFailed, setImageFailed] = useState(false)
  const initials = `${user?.nome?.[0] ?? ''}${user?.cognome?.[0] ?? ''}`.toUpperCase() || 'EH'
  const avatarUrl = user?.fotoProfiloUrl
  if (avatarUrl && !imageFailed) {
    return (
      <img
        className={large ? 'avatar avatar-large' : 'avatar'}
        src={avatarUrl}
        alt={`Avatar di ${user?.nome ?? 'utente'}`}
        onError={() => setImageFailed(true)}
      />
    )
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

function titleForView(view, isOperator = false, isAdmin = false) {
  if (view === 'dashboard') return isOperator ? (isAdmin ? 'Dashboard amministratore' : 'Dashboard operatore') : 'Dashboard dipendente'
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

function withCacheToken(url) {
  if (!url) return url
  return `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`
}

function avatarCacheKey(email) {
  return `exhelpdesk-avatar-cache:${email || 'anonymous'}`
}

function readCachedAvatar(email) {
  try {
    return localStorage.getItem(avatarCacheKey(email)) || ''
  } catch {
    return ''
  }
}

function cacheAvatar(email, dataUrl) {
  if (!email || !dataUrl) return
  localStorage.setItem(avatarCacheKey(email), dataUrl)
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve('')
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => resolve('')
    reader.readAsDataURL(file)
  })
}
function ticketCacheKey(email) {
  return `exhelpdesk-ticket-cache:${email || 'anonymous'}`
}

function globalTicketCacheKey() {
  return 'exhelpdesk-ticket-cache:all'
}

function readCachedTickets(email) {
  try {
    const raw = localStorage.getItem(ticketCacheKey(email))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCachedTickets(email, tickets) {
  if (!email) return
  localStorage.setItem(ticketCacheKey(email), JSON.stringify(tickets))
}

function readGlobalCachedTickets() {
  try {
    const raw = localStorage.getItem(globalTicketCacheKey())
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeGlobalCachedTickets(tickets) {
  localStorage.setItem(globalTicketCacheKey(), JSON.stringify(mergeTicketLists(tickets, readGlobalCachedTickets())))
}

function getFallbackTickets(user, isOperator) {
  const ownTickets = readCachedTickets(user?.email)
  return isOperator ? mergeTicketLists(readGlobalCachedTickets(), ownTickets) : ownTickets
}

function mergeTicketLists(primary, fallback) {
  const byId = new Map()
  ;[...(fallback ?? []), ...(primary ?? [])].forEach((ticket) => {
    if (ticket?.id) byId.set(ticket.id, ticket)
  })
  return [...byId.values()]
}

function upsertCachedTicket(email, ticket) {
  if (!email || !ticket?.id) return
  writeCachedTickets(email, mergeTicketLists([ticket], readCachedTickets(email)))
}

function upsertGlobalCachedTicket(ticket) {
  if (!ticket?.id) return
  writeGlobalCachedTickets([ticket])
}

export default App
