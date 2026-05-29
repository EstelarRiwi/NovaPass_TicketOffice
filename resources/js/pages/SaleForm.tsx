import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import {
  Search, X, User, Users, LogOut, Zap, ShoppingCart,
  Minus, Plus, UserX, ChevronDown, AlertCircle,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface Customer {
  id: string
  name: string
  email: string
}

interface Category {
  id: string
  name: string
  price: number
  available: number
}

interface Event {
  id: string
  name: string
  date: string
  venue?: string
  categories: Category[]
}

interface Ticket {
  id: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatPrice = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

const initials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

// ── Component ─────────────────────────────────────────────────────────────────

type CustomerState = 'idle' | 'searching' | 'found' | 'not_found' | 'guest'

export default function SaleForm() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // Customer
  const [query, setQuery]               = useState('')
  const [customerState, setCustomerState] = useState<CustomerState>('idle')
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null)
  const [guestName, setGuestName]       = useState('')
  const [guestEmail, setGuestEmail]     = useState('')
  const searchTimerRef                  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Sale config
  const [events, setEvents]               = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [quantity, setQuantity]           = useState(1)

  // Submission
  const [saleLoading, setSaleLoading] = useState(false)
  const [saleError, setSaleError]     = useState('')

  // Responsive
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Load events
  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<Event[]>('/events')
        setEvents(data)
      } catch {
        setEvents([])
      } finally {
        setEventsLoading(false)
      }
    }
    load()
  }, [])

  // Customer search — debounced
  const performSearch = useCallback(async (q: string) => {
    setCustomerState('searching')
    try {
      const result = await api.get<Customer | null>(`/users/search?q=${encodeURIComponent(q)}`)
      if (result) {
        setFoundCustomer(result)
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

  // Derived state
  const customerReady =
    customerState === 'found' ||
    (customerState === 'guest' && guestName.trim().length > 0)

  const canSell = customerReady && selectedEvent !== null && selectedCategory !== null

  const total = selectedCategory ? selectedCategory.price * quantity : 0

  // Submit sale
  const handleSell = async () => {
    if (!canSell || !selectedEvent || !selectedCategory) return
    setSaleLoading(true)
    setSaleError('')
    try {
      const payload = {
        event_id: selectedEvent.id,
        category_id: selectedCategory.id,
        quantity,
        ...(customerState === 'found' && foundCustomer
          ? { user_id: foundCustomer.id }
          : {
              guest_name: guestName.trim(),
              ...(guestEmail.trim() ? { guest_email: guestEmail.trim() } : {}),
            }),
      }

      const ticket = await api.post<Ticket>('/tickets/sell', payload)

      navigate('/confirmation', {
        state: {
          ticket_id: ticket.id,
          customer_name: customerState === 'found' ? foundCustomer!.name : guestName.trim(),
          customer_email: customerState === 'found'
            ? foundCustomer!.email
            : (guestEmail.trim() || undefined),
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>

      {/* ── Header ── */}
      <header style={{
        background: 'rgba(15, 14, 24, 0.96)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--glass-border)',
        padding: '0.875rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Zap size={20} color="var(--color-cta)" fill="var(--color-cta)" />
          <span style={{
            fontFamily: 'var(--font-heading)', fontSize: '1.25rem',
            color: 'var(--color-primary-light)',
            textShadow: '0 0 20px rgba(192, 132, 252, 0.45)',
          }}>NovaPass</span>
          <span style={{
            fontSize: '0.75rem', color: 'var(--color-cta)', fontWeight: 600,
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: '999px', padding: '0.2rem 0.625rem',
          }}>
            Punto de Venta
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(147,51,234,0.2)', border: '1px solid rgba(147,51,234,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-primary-light)',
              }}>
                {initials(user.name)}
              </div>
              {!isMobile && (
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  {user.name}
                </span>
              )}
            </div>
          )}
          <button onClick={logout} className="btn btn-outline btn-sm" style={{ gap: '0.375rem' }}>
            <LogOut size={13} /> Salir
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '1.5rem',
        padding: '1.5rem',
        alignItems: 'start',
        maxWidth: 1200,
        margin: '0 auto',
        width: '100%',
      }}>

        {/* ── LEFT: Customer ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Users size={18} color="var(--color-primary-light)" />
            <h2 style={{ fontSize: '1.125rem', fontFamily: 'var(--font-heading)' }}>Cliente</h2>
          </div>

          {/* Search bar */}
          {(customerState === 'idle' || customerState === 'searching' || customerState === 'not_found') && (
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}>
                {customerState === 'searching'
                  ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  : <Search size={16} color="var(--color-text-muted)" />
                }
              </div>
              <input
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setCustomerState('idle') }}
                placeholder="Buscar por correo o cédula..."
                style={{ paddingLeft: '2.5rem', paddingRight: query ? '2.5rem' : '1rem' }}
                autoFocus
              />
              {query && (
                <button
                  onClick={clearCustomer}
                  style={{
                    position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--color-text-muted)',
                    padding: '0.25rem', cursor: 'pointer', display: 'flex',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* Idle hint */}
          {customerState === 'idle' && !query && (
            <div style={{
              padding: '1.5rem', borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--glass-border)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
              color: 'var(--color-text-muted)', textAlign: 'center',
            }}>
              <User size={32} color="var(--color-text-muted)" style={{ opacity: 0.5 }} />
              <div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                  Busca al cliente
                </div>
                <div style={{ fontSize: '0.8125rem', opacity: 0.7 }}>
                  Ingresa correo o número de cédula (mín. 3 caracteres)
                </div>
              </div>
            </div>
          )}

          {/* Not found */}
          {customerState === 'not_found' && (
            <div style={{
              padding: '1.25rem', borderRadius: 'var(--radius-md)',
              background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)',
              display: 'flex', flexDirection: 'column', gap: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <UserX size={18} color="#F87171" />
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#F87171' }}>
                  No se encontró cliente
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                ¿Deseas registrar la venta como invitado?
              </p>
              <button
                onClick={() => setCustomerState('guest')}
                className="btn btn-outline btn-sm"
                style={{ width: 'auto', alignSelf: 'flex-start' }}
              >
                <Users size={14} /> Continuar como invitado
              </button>
            </div>
          )}

          {/* Found customer */}
          {customerState === 'found' && foundCustomer && (
            <div style={{
              padding: '1.25rem', borderRadius: 'var(--radius-md)',
              background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)',
              display: 'flex', alignItems: 'center', gap: '1rem',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(147,51,234,0.15)', border: '2px solid rgba(147,51,234,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-heading)', fontSize: '1.0625rem',
                color: 'var(--color-primary-light)',
              }}>
                {initials(foundCustomer.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.125rem' }}>
                  {foundCustomer.name}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {foundCustomer.email}
                </div>
                <span className="badge badge-success" style={{ marginTop: '0.375rem' }}>
                  Cliente seleccionado
                </span>
              </div>
              <button
                onClick={clearCustomer}
                style={{
                  background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
                  borderRadius: 'var(--radius-sm)', padding: '0.375rem',
                  color: '#F87171', cursor: 'pointer', flexShrink: 0, display: 'flex',
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Guest form */}
          {customerState === 'guest' && (
            <div style={{
              padding: '1.25rem', borderRadius: 'var(--radius-md)',
              background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
              display: 'flex', flexDirection: 'column', gap: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={16} color="var(--color-cta)" />
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-cta)' }}>
                    Venta como invitado
                  </span>
                </div>
                <button
                  onClick={clearCustomer}
                  style={{
                    background: 'none', border: 'none', color: 'var(--color-text-muted)',
                    cursor: 'pointer', display: 'flex', padding: '0.25rem',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
              <div>
                <label htmlFor="guest-name">Nombre <span style={{ color: '#F87171' }}>*</span></label>
                <input
                  id="guest-name"
                  type="text"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="Nombre completo del cliente"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="guest-email">Correo electrónico (opcional)</label>
                <input
                  id="guest-email"
                  type="email"
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  placeholder="para enviar la boleta"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Sale config ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <ShoppingCart size={18} color="var(--color-primary-light)" />
            <h2 style={{ fontSize: '1.125rem', fontFamily: 'var(--font-heading)' }}>Configurar Venta</h2>
          </div>

          {/* Event selector */}
          <div>
            <label htmlFor="event-select">Evento</label>
            <div style={{ position: 'relative' }}>
              <select
                id="event-select"
                value={selectedEvent?.id ?? ''}
                onChange={e => handleEventChange(e.target.value)}
                disabled={eventsLoading}
                style={{ paddingRight: '2.5rem', appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">
                  {eventsLoading ? 'Cargando eventos...' : '— Selecciona un evento —'}
                </option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} · {formatDate(ev.date)}
                  </option>
                ))}
              </select>
              <div style={{
                position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}>
                {eventsLoading
                  ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  : <ChevronDown size={16} color="var(--color-text-muted)" />
                }
              </div>
            </div>
          </div>

          {/* Category cards */}
          {selectedEvent && (
            <div>
              <label style={{ marginBottom: '0.625rem' }}>Categoría</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedEvent.categories.map(cat => {
                  const active = selectedCategory?.id === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        padding: '0.875rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        background: active ? 'rgba(147,51,234,0.14)' : 'var(--glass-bg)',
                        border: `2px solid ${active ? 'rgba(147,51,234,0.6)' : 'var(--glass-border)'}`,
                        cursor: 'pointer',
                        transition: 'all 200ms ease',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        boxShadow: active ? '0 0 16px rgba(147,51,234,0.2)' : 'none',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-text)' }}>
                          {cat.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                          {cat.available} disponibles
                        </div>
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-heading)', fontSize: '1.125rem',
                        color: active ? 'var(--color-cta)' : 'var(--color-primary-light)',
                        transition: 'color 200ms ease',
                      }}>
                        {formatPrice(cat.price)}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          {selectedCategory && (
            <div>
              <label>Cantidad</label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem',
              }}>
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                    background: quantity <= 1 ? 'rgba(255,255,255,0.03)' : 'rgba(147,51,234,0.15)',
                    border: `1px solid ${quantity <= 1 ? 'var(--glass-border)' : 'rgba(147,51,234,0.4)'}`,
                    color: quantity <= 1 ? 'var(--color-text-muted)' : 'var(--color-primary-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: quantity <= 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 150ms ease', flexShrink: 0,
                  }}
                >
                  <Minus size={16} />
                </button>
                <span style={{
                  flex: 1, textAlign: 'center',
                  fontFamily: 'var(--font-heading)', fontSize: '2rem',
                  color: 'var(--color-text)', lineHeight: 1,
                }}>
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(q => Math.min(10, q + 1))}
                  disabled={quantity >= 10}
                  style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                    background: quantity >= 10 ? 'rgba(255,255,255,0.03)' : 'rgba(147,51,234,0.15)',
                    border: `1px solid ${quantity >= 10 ? 'var(--glass-border)' : 'rgba(147,51,234,0.4)'}`,
                    color: quantity >= 10 ? 'var(--color-text-muted)' : 'var(--color-primary-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: quantity >= 10 ? 'not-allowed' : 'pointer',
                    transition: 'all 150ms ease', flexShrink: 0,
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.375rem' }}>
                Máximo 10 boletas por transacción
              </div>
            </div>
          )}

          {/* Order summary */}
          {selectedCategory && (
            <div style={{
              background: 'rgba(245,158,11,0.05)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 'var(--radius-md)', padding: '1.25rem',
              display: 'flex', flexDirection: 'column', gap: '0.625rem',
            }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                Resumen
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  {selectedCategory.name} × {quantity}
                </span>
                <span>{formatPrice(selectedCategory.price)} c/u</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(245,158,11,0.15)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>Total</span>
                <span style={{
                  fontFamily: 'var(--font-heading)', fontSize: '1.625rem',
                  color: 'var(--color-cta)',
                  textShadow: '0 0 16px rgba(245,158,11,0.35)',
                }}>
                  {formatPrice(total)}
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {saleError && (
            <div className="alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={15} /> {saleError}
            </div>
          )}

          {/* Sell button */}
          <button
            className="btn btn-cta btn-lg"
            onClick={handleSell}
            disabled={!canSell || saleLoading}
            style={{ marginTop: '0.25rem' }}
          >
            {saleLoading
              ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2, borderTopColor: '#0A0A0F' }} />
              : <><ShoppingCart size={20} /> Realizar Venta</>
            }
          </button>

          {!canSell && (
            <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '-0.5rem' }}>
              {!customerReady
                ? 'Selecciona o registra un cliente primero'
                : !selectedEvent
                ? 'Selecciona un evento'
                : 'Selecciona una categoría'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
