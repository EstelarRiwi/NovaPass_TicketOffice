import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import {
  Search, X, User, Users, LogOut, Star, ShoppingCart,
  Minus, Plus, UserX, ChevronDown, AlertCircle, Check, Ticket,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface Customer { id: string; name: string; email: string }
interface Category { id: string; name: string; price: number; available: number }
interface Event { id: string; name: string; date: string; venue?: string; categories: Category[] }

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatPrice = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'long' })

const initials = (name: string | undefined) =>
  (name ?? '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

type CustomerState = 'idle' | 'searching' | 'found' | 'not_found' | 'guest'

// ── Component ─────────────────────────────────────────────────────────────────

export default function SaleForm() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [query, setQuery]                   = useState('')
  const [customerState, setCustomerState]   = useState<CustomerState>('idle')
  const [foundCustomer, setFoundCustomer]   = useState<Customer | null>(null)
  const [guestName, setGuestName]           = useState('')
  const [guestEmail, setGuestEmail]         = useState('')
  const searchTimerRef                      = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [events, setEvents]                         = useState<Event[]>([])
  const [eventsLoading, setEventsLoading]           = useState(true)
  const [selectedEvent, setSelectedEvent]           = useState<Event | null>(null)
  const [selectedCategory, setSelectedCategory]     = useState<Category | null>(null)
  const [quantity, setQuantity]                     = useState(1)
  const [saleLoading, setSaleLoading]               = useState(false)
  const [saleError, setSaleError]                   = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<any>('/events')
        const raw: any[] = res?.data?.events ?? res?.events ?? (Array.isArray(res) ? res : [])
        setEvents(raw.map((e: any) => ({
          id: String(e.id).trim(),
          name: e.title ?? e.name ?? '',
          date: e.date ?? e.eventDate ?? '',
          venue: e.venue,
          categories: (e.categories ?? e.ticketCategories ?? []).map((c: any) => ({
            id: String(c.id).trim(),
            name: c.name,
            price: c.price,
            available: c.available ?? c.availableCapacity ?? 0,
          })),
        })))
      } catch {
        setEvents([])
      } finally {
        setEventsLoading(false)
      }
    }
    load()
  }, [])

  const performSearch = useCallback(async (q: string) => {
    setCustomerState('searching')
    try {
      const res = await api.get<any>(`/users/search?q=${encodeURIComponent(q)}`)
      const raw = res?.data ?? res
      if (raw && raw.id) {
        setFoundCustomer({ id: String(raw.id).trim(), name: raw.name ?? raw.fullName ?? '', email: raw.email })
        setCustomerState('found')
      } else {
        setCustomerState('not_found')
      }
    } catch {
      setCustomerState('not_found')
    }
  }, [])

  useEffect(() => {
    if (query.trim().length < 3) return
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => performSearch(query.trim()), 400)
    return () => clearTimeout(searchTimerRef.current)
  }, [query, performSearch])

  const clearCustomer = () => {
    setQuery('')
    setFoundCustomer(null)
    setGuestName('')
    setGuestEmail('')
    setCustomerState('idle')
  }

  const handleEventChange = (eventId: string) => {
    const ev = events.find(e => e.id === eventId) ?? null
    setSelectedEvent(ev)
    setSelectedCategory(null)
    setQuantity(1)
  }

  const customerReady =
    customerState === 'found' ||
    (customerState === 'guest' && guestName.trim().length > 0)

  const canSell = customerReady && selectedEvent !== null && selectedCategory !== null
  const total = selectedCategory ? selectedCategory.price * quantity : 0
  const serviceFee = Math.round(total * 0.04)

  const handleSell = async () => {
    if (!canSell || !selectedEvent || !selectedCategory) return
    setSaleLoading(true)
    setSaleError('')
    try {
      const payload = {
        eventId: selectedEvent.id,
        categoryId: selectedCategory.id,
        quantity,
        seatId: null,
        ...(customerState === 'found' && foundCustomer
          ? { buyerUserId: foundCustomer.id, buyerName: foundCustomer.name, buyerEmail: foundCustomer.email }
          : { buyerName: guestName.trim(), ...(guestEmail.trim() ? { buyerEmail: guestEmail.trim() } : {}) }),
      }
      const res = await api.post<any>('/tickets/presential', payload)
      const ticketId = res?.data?.id ?? res?.id ?? ''
      navigate('/confirmation', {
        state: {
          ticket_id: ticketId,
          customer_name: customerState === 'found' ? foundCustomer!.name : guestName.trim(),
          customer_email: customerState === 'found' ? foundCustomer!.email : (guestEmail.trim() || undefined),
          event_name: selectedEvent.name,
          event_date: selectedEvent.date,
          category_name: selectedCategory.name,
          quantity,
          total,
        },
      })
    } catch (err) {
      setSaleError(err instanceof Error ? err.message : 'Error al procesar la venta')
    } finally {
      setSaleLoading(false)
    }
  }

  const step1Done = customerReady
  const step2Done = step1Done && selectedEvent !== null && selectedCategory !== null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="pos">
      {/* Top bar */}
      <header className="pos-top">
        <div className="pos-brand">
          <div className="mark">
            <Star size={18} fill="currentColor" strokeWidth={0} />
          </div>
          Nova<b>Pass</b>
          <span className="sub">Taquilla</span>
        </div>
        <div className="pos-top-right">
          {user && (
            <div className="pos-cashier">
              <div className="av" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #7C3AED, #9333EA)', fontWeight: 700, fontSize: '0.78rem', color: '#fff', borderRadius: 11 }}>
                {initials(user.name)}
              </div>
              <div className="pos-point">
                <div className="p">{user.name}</div>
                <div className="s">Taquilla</div>
              </div>
            </div>
          )}
          <button onClick={logout} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      {/* Workspace */}
      <div className="pos-work">
        {/* Main area */}
        <div className="pos-main">
          {/* Steps */}
          <div className="pos-steps">
            <div className={`pos-step ${step1Done ? 'done' : customerState !== 'idle' ? 'active' : ''}`}>
              <span className="n">{step1Done ? <Check size={12} /> : '1'}</span>
              Cliente
            </div>
            <div className="pos-step-line" />
            <div className={`pos-step ${step2Done ? 'done' : step1Done ? 'active' : ''}`}>
              <span className="n">{step2Done ? <Check size={12} /> : '2'}</span>
              Evento & Categoría
            </div>
            <div className="pos-step-line" />
            <div className={`pos-step ${canSell ? 'active' : ''}`}>
              <span className="n">3</span>
              Confirmar
            </div>
          </div>

          {/* Step 1 — Customer */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 className="pos-h">Paso 1: Cliente</h2>
            <p className="pos-sub">Busca al cliente por correo o cédula</p>

            {(customerState === 'idle' || customerState === 'searching' || customerState === 'not_found') && (
              <div className="pos-search" style={{ marginBottom: '1rem' }}>
                <div className="field">
                  {customerState === 'searching'
                    ? <span className="spinner" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, borderWidth: 2 }} />
                    : <Search size={16} />}
                  <input
                    type="text"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setCustomerState('idle') }}
                    placeholder="Buscar por correo o cédula..."
                    autoFocus
                  />
                </div>
                {query && (
                  <button className="btn btn-ghost btn-sm" onClick={clearCustomer} style={{ flexShrink: 0 }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            <div className="cust-list">
              {customerState === 'idle' && !query && (
                <div className="cust-card cust-walkin" style={{ cursor: 'default' }}>
                  <div className="av"><User size={20} /></div>
                  <div className="info">
                    <div className="nm" style={{ opacity: 0.6 }}>Busca al cliente</div>
                    <div className="meta"><span>Ingresa correo o cédula (mín. 3 caracteres)</span></div>
                  </div>
                </div>
              )}

              {customerState === 'found' && foundCustomer && (
                <div className="cust-card sel">
                  <div className="av" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #7C3AED, #9333EA)', fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
                    {initials(foundCustomer.name)}
                  </div>
                  <div className="info">
                    <div className="nm">{foundCustomer.name}</div>
                    <div className="meta"><span>{foundCustomer.email}</span></div>
                  </div>
                  <div className="pick"><Check size={18} /></div>
                  <button onClick={clearCustomer} className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>
                    <X size={14} />
                  </button>
                </div>
              )}

              {customerState === 'not_found' && (
                <>
                  <div className="cust-card" style={{ borderColor: 'rgba(248,113,113,0.4)', cursor: 'default' }}>
                    <div className="av" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(248,113,113,0.1)', color: '#F87171' }}>
                      <UserX size={20} />
                    </div>
                    <div className="info">
                      <div className="nm" style={{ color: '#F87171' }}>No se encontró cliente</div>
                      <div className="meta"><span>"{query}" no tiene cuenta en NovaPass</span></div>
                    </div>
                  </div>
                  <div className="cust-card cust-walkin" onClick={() => setCustomerState('guest')} style={{ cursor: 'pointer' }}>
                    <div className="av"><Users size={20} /></div>
                    <div className="info">
                      <div className="nm">Continuar como invitado</div>
                      <div className="meta"><span>Venta sin cuenta registrada</span></div>
                    </div>
                  </div>
                </>
              )}

              {customerState === 'guest' && (
                <div className="cust-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--color-cta)' }}>
                      <Users size={16} /> Venta como invitado
                    </div>
                    <button onClick={clearCustomer} className="btn btn-ghost btn-sm"><X size={14} /></button>
                  </div>
                  <div>
                    <label className="form-label">Nombre *</label>
                    <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Nombre completo del cliente" autoFocus />
                  </div>
                  <div>
                    <label className="form-label">Correo electrónico (opcional)</label>
                    <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="para enviar la boleta" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2 — Event & Category */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 className="pos-h">Paso 2: Evento y Categoría</h2>
            <p className="pos-sub">Selecciona el evento y el tipo de entrada</p>

            <div style={{ marginBottom: '1.2rem' }}>
              <label className="form-label">Evento</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedEvent?.id ?? ''}
                  onChange={e => handleEventChange(e.target.value)}
                  disabled={eventsLoading}
                  style={{ paddingRight: '2.5rem', appearance: 'none', cursor: 'pointer' }}
                >
                  <option value="">{eventsLoading ? 'Cargando eventos...' : '— Selecciona un evento —'}</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} · {formatDate(ev.date)}
                    </option>
                  ))}
                </select>
                <div style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  {eventsLoading
                    ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    : <ChevronDown size={16} />}
                </div>
              </div>
            </div>

            {selectedEvent && (
              <>
                <label className="form-label">Categoría</label>
                <div className="cat-list">
                  {selectedEvent.categories.map(cat => {
                    const active = selectedCategory?.id === cat.id
                    const soldOut = cat.available <= 0
                    return (
                      <div
                        key={cat.id}
                        className={`cat-row ${soldOut ? 'soldout' : ''}`}
                        style={{
                          cursor: soldOut ? 'not-allowed' : 'pointer',
                          borderColor: active ? 'var(--color-primary)' : undefined,
                          boxShadow: active ? '0 0 0 3px rgba(124,58,237,0.12)' : undefined,
                        }}
                        onClick={() => !soldOut && setSelectedCategory(cat)}
                      >
                        <div className="ci"><Ticket size={20} /></div>
                        <div className="cinfo">
                          <div className="cn">{cat.name}</div>
                          <div className="ca">{soldOut ? 'Agotado' : `${cat.available} disponibles`}</div>
                        </div>
                        <div className="cprice">{formatPrice(cat.price)}</div>
                        {active && (
                          <div className="stepper">
                            <button onClick={e => { e.stopPropagation(); setQuantity(q => Math.max(1, q - 1)) }} disabled={quantity <= 1}>
                              <Minus size={14} />
                            </button>
                            <span className="q">{quantity}</span>
                            <button onClick={e => { e.stopPropagation(); setQuantity(q => Math.min(10, q + 1)) }} disabled={quantity >= 10}>
                              <Plus size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {!selectedEvent && (
              <div className="pos-empty">
                <Ticket size={38} />
                <p>Selecciona un evento para ver las categorías</p>
              </div>
            )}
          </div>

          {saleError && (
            <div className="alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={15} /> {saleError}
            </div>
          )}
        </div>

        {/* Right rail — cart */}
        <div className="pos-rail">
          <div className="rail-title">Resumen de venta</div>

          {/* Customer in rail */}
          <div className="rail-cust">
            {customerReady ? (
              <>
                <div className="av ph" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  {initials(customerState === 'found' ? foundCustomer?.name : guestName)}
                </div>
                <div>
                  <div className="nm">{customerState === 'found' ? foundCustomer?.name : guestName || 'Invitado'}</div>
                  <div className="em">{customerState === 'found' ? foundCustomer?.email : guestEmail || 'Sin correo'}</div>
                </div>
                <button className="change" onClick={clearCustomer}>Cambiar</button>
              </>
            ) : (
              <>
                <div className="av ph"><User size={18} /></div>
                <div>
                  <div className="nm" style={{ opacity: 0.5 }}>Sin cliente</div>
                  <div className="em">Busca en el paso 1</div>
                </div>
              </>
            )}
          </div>

          {/* Event in rail */}
          {selectedEvent && (
            <div className="rail-event">
              <Ticket size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedEvent.name}</span>
            </div>
          )}

          {/* Items */}
          <div className="rail-items">
            {selectedCategory ? (
              <div className="rail-item">
                <div className="ri-l">
                  <div className="n">{selectedCategory.name}</div>
                  <div className="q">{quantity} × {formatPrice(selectedCategory.price)}</div>
                </div>
                <div className="ri-r">{formatPrice(selectedCategory.price * quantity)}</div>
              </div>
            ) : (
              <div className="rail-empty">
                <ShoppingCart size={28} />
                <p>Selecciona categoría y cantidad</p>
              </div>
            )}
          </div>

          {/* Totals */}
          {selectedCategory && (
            <div className="rail-totals">
              <div className="rail-trow">
                <span>Subtotal</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="rail-trow">
                <span>Cargo por servicio (4%)</span>
                <span>{formatPrice(serviceFee)}</span>
              </div>
              <div className="rail-trow grand">
                <span>Total</span>
                <span className="v">{formatPrice(total + serviceFee)}</span>
              </div>
            </div>
          )}

          {/* Process button */}
          <div className="rail-pay">
            <button
              className="btn btn-cta btn-lg"
              style={{ width: '100%' }}
              onClick={handleSell}
              disabled={!canSell || saleLoading}
            >
              {saleLoading
                ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                : <><ShoppingCart size={18} /> Procesar Venta</>
              }
            </button>
            {!canSell && (
              <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                {!customerReady ? 'Selecciona un cliente primero'
                  : !selectedEvent ? 'Selecciona un evento'
                  : 'Selecciona una categoría'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
