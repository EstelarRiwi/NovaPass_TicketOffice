import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../hooks/useTheme'
import { useAvailability } from '../hooks/useAvailability'
import { useNotifications } from '../hooks/useNotifications'
import { api } from '../api/client'
import {
  Search, X, User, LogOut, Star, ShoppingCart,
  Minus, Plus, Check, Ticket, MapPin, Music, CreditCard,
  Banknote, QrCode, Moon, Sun,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface Customer { id: string; name: string; email: string; cc?: string; city?: string }
interface Category { id: string; name: string; price: number; available: number }
interface Event { id: string; name: string; date: string; venue?: string; city?: string; image?: string; categories: Category[] }
interface CartItem extends Category { n: number }

// ── Helpers ───────────────────────────────────────────────────────────────────

const cop = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

function fmtDay(d: string) {
  const dt = new Date(d)
  return {
    day: dt.toLocaleDateString('es-CO', { day: 'numeric' }),
    mon: dt.toLocaleDateString('es-CO', { month: 'short' }).toUpperCase(),
  }
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

type SearchMode = 'email' | 'cc' | 'name'
type PayMethod = 'cash' | 'card' | 'transfer'

// ── Step pill ────────────────────────────────────────────────────────────────

function StepPill({ n, label, step }: { n: number; label: string; step: number }) {
  const cls = step === n ? 'active' : step > n ? 'done' : ''
  return (
    <div className={`pos-step ${cls}`}>
      <span className="n">{step > n ? <Check size={14} /> : n}</span>
      {label}
    </div>
  )
}

// ── PayModal ─────────────────────────────────────────────────────────────────

function PayModal({
  total, payMethod, setPayMethod, cashGiven, setCashGiven, loading, onClose, onConfirm,
}: {
  total: number
  payMethod: PayMethod
  setPayMethod: (m: PayMethod) => void
  cashGiven: string
  setCashGiven: (s: string) => void
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const given = parseInt((cashGiven || '').replace(/\D/g, ''), 10) || 0
  const change = given - total
  const METHODS: { id: PayMethod; nm: string; ds: string; Icon: React.FC<{ size: number }> }[] = [
    { id: 'cash',     nm: 'Efectivo',           ds: 'Pago en caja',                 Icon: Banknote },
    { id: 'card',     nm: 'Tarjeta',            ds: 'Datáfono · débito o crédito',  Icon: CreditCard },
    { id: 'transfer', nm: 'Transferencia / QR', ds: 'Nequi, Bancolombia',           Icon: QrCode },
  ]
  return (
    <div className="pos-modal-bg" onClick={onClose}>
      <div className="pay-modal" onClick={e => e.stopPropagation()}>
        <h3>Cobrar venta</h3>
        <p style={{ color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '0.88rem', marginBottom: 0 }}>
          Confirma el método de pago para emitir las entradas.
        </p>
        <div className="total-big">{cop(total)}</div>
        <div className="pay-opts">
          {METHODS.map(m => (
            <div
              key={m.id}
              className={`pay-opt ${payMethod === m.id ? 'sel' : ''}`}
              onClick={() => setPayMethod(m.id)}
            >
              <div className="pi"><m.Icon size={19} /></div>
              <div className="pt">{m.nm}<div className="ps">{m.ds}</div></div>
              <div
                style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: payMethod === m.id ? '6px solid var(--color-primary)' : '2px solid var(--color-border)',
                }}
              />
            </div>
          ))}
        </div>
        {payMethod === 'cash' && (
          <div className="cash-calc">
            <div>
              <label>Efectivo recibido</label>
              <input value={cashGiven} onChange={e => setCashGiven(e.target.value)} placeholder="$0" style={{ padding: '0.6rem 0.7rem' }} />
            </div>
            <div>
              <label>Cambio</label>
              <div className="change-out">{given >= total ? cop(change) : '—'}</div>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.7rem' }}>
          <button className="btn btn-ghost btn-lg" onClick={onClose} disabled={loading}>Cancelar</button>
          <button
            className="btn btn-cta btn-lg"
            style={{ flex: 1 }}
            disabled={(payMethod === 'cash' && given < total) || loading}
            onClick={onConfirm}
          >
            {loading
              ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
              : <><Check size={18} /> Confirmar pago</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CartRail ──────────────────────────────────────────────────────────────────

function CartRail({
  customer, event, items, totalQty, subtotal, setStep, onPay,
}: {
  customer: Customer | null
  event: Event | null
  items: CartItem[]
  totalQty: number
  subtotal: number
  setStep: (n: number) => void
  onPay: () => void
}) {
  return (
    <div className="pos-rail">
      <div className="rail-title">Venta actual</div>

      {customer
        ? (
          <div className="rail-cust">
            <div className="av ph" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
              {customer.id === 'walk' ? <User size={18} /> : initials(customer.name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="nm">{customer.name}</div>
              <div className="em">{customer.email}</div>
            </div>
            <button className="change" onClick={e => { e.preventDefault(); setStep(1) }}>
              Cambiar
            </button>
          </div>
        )
        : (
          <div className="rail-cust" style={{ color: 'var(--color-text-muted)' }}>
            <div className="av ph" style={{ background: 'var(--color-border)' }}><User size={18} /></div>
            <div>
              <div className="nm" style={{ color: 'var(--color-text-muted)' }}>Sin cliente</div>
              <div className="em">Selecciona en el paso 1</div>
            </div>
          </div>
        )
      }

      {event && (
        <div className="rail-event">
          <Music size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          {event.name}
        </div>
      )}

      <div className="rail-items">
        {items.length > 0
          ? items.map(i => (
            <div key={i.id} className="rail-item">
              <div className="ri-l">
                <div className="n">{i.name}</div>
                <div className="q">{i.n} × {cop(i.price)}</div>
              </div>
              <div className="ri-r">{cop(i.price * i.n)}</div>
            </div>
          ))
          : (
            <div className="rail-empty">
              <ShoppingCart size={40} />
              <p style={{ fontSize: '0.85rem', maxWidth: 200 }}>
                {event ? 'Agrega boletas para continuar' : 'La venta aparecerá aquí'}
              </p>
            </div>
          )
        }
      </div>

      <div className="rail-totals">
        <div className="rail-trow">
          <span>Boletas ({totalQty})</span>
          <span>{cop(subtotal)}</span>
        </div>
        <div className="rail-trow">
          <span>Cargo en taquilla</span>
          <span>Sin cargo</span>
        </div>
        <div className="rail-trow grand">
          <span>Total</span>
          <span className="v">{cop(subtotal)}</span>
        </div>
        <button
          className="btn btn-cta btn-lg btn-block"
          style={{ marginTop: '1.1rem' }}
          disabled={items.length === 0 || !customer}
          onClick={onPay}
        >
          <Banknote size={18} /> Cobrar {cop(subtotal)}
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SaleForm() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { theme, toggle: toggleTheme } = useTheme()

  const [step, setStep] = useState(1)

  // Step 1 — customer
  const [searchMode, setSearchMode] = useState<SearchMode>('email')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Step 2 — event
  const [events, setEvents] = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [event, setEvent] = useState<Event | null>(null)

  // Step 3 — categories
  const [qty, setQty] = useState<Record<string, number>>({})

  // Payment
  const [payOpen, setPayOpen] = useState(false)
  const [payMethod, setPayMethod] = useState<PayMethod>('cash')
  const [cashGiven, setCashGiven] = useState('')
  const [saleLoading, setSaleLoading] = useState(false)
  const [saleError, setSaleError] = useState('')

  // Derived
  const items: CartItem[] = event
    ? event.categories.filter(c => (qty[c.id] ?? 0) > 0).map(c => ({ ...c, n: qty[c.id] }))
    : []
  const subtotal = items.reduce((s, i) => s + i.price * i.n, 0)
  const totalQty = items.reduce((s, i) => s + i.n, 0)

  // Real-time availability
  const wsBaseUrl = (import.meta.env.VITE_WS_URL as string | undefined) ?? null

  useAvailability(wsBaseUrl, useCallback((eventId: string, categoryId: string, available: number) => {
    setEvents(prev => prev.map(ev =>
      ev.id !== eventId ? ev : {
        ...ev,
        categories: ev.categories.map(c => c.id === categoryId ? { ...c, available } : c),
      }
    ))
    setEvent(prev =>
      !prev || prev.id !== eventId ? prev : {
        ...prev,
        categories: prev.categories.map(c => c.id === categoryId ? { ...c, available } : c),
      }
    )
  }, []))

  // Seller broadcast toasts
  const { toasts, dismiss } = useNotifications(wsBaseUrl, user?.id ?? null)

  // Load events
  useEffect(() => {
    api.get<any>('/events')
      .then(res => {
        const raw: any[] = res?.data?.events ?? res?.events ?? (Array.isArray(res) ? res : [])
        setEvents(raw.map((e: any) => ({
          id: String(e.id),
          name: e.title ?? e.name ?? '',
          date: e.date ?? e.eventDate ?? '',
          venue: e.venue,
          city: e.city,
          image: e.image ?? e.imageUrl,
          categories: (e.categories ?? e.ticketCategories ?? []).map((c: any) => ({
            id: String(c.id),
            name: c.name,
            price: c.price,
            available: c.available ?? c.availableCapacity ?? 0,
          })),
        })))
      })
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false))
  }, [])

  // Customer search
  const doSearch = useCallback(async (q: string) => {
    setSearching(true)
    try {
      const res = await api.get<any>(`/users/search?q=${encodeURIComponent(q)}`)
      const raw = res?.data ?? res
      if (raw && raw.id) {
        setSearchResults([{
          id: String(raw.id),
          name: raw.name ?? raw.fullName ?? '',
          email: raw.email,
          cc: raw.cedula ?? raw.cc,
          city: raw.city,
        }])
      } else {
        setSearchResults([])
      }
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (query.trim().length < 3) { setSearchResults([]); return }
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => doSearch(query.trim()), 400)
    return () => clearTimeout(searchTimer.current)
  }, [query, doSearch])

  const pickCustomer = (c: Customer) => { setCustomer(c); setStep(2) }
  const clearCustomer = () => { setQuery(''); setSearchResults([]); setCustomer(null) }
  const pickEvent = (e: Event) => { setEvent(e); setQty({}); setStep(3) }

  const changeQty = (catId: string, delta: number, max: number) => {
    setQty(prev => {
      const cur = prev[catId] ?? 0
      const next = Math.max(0, Math.min(max, cur + delta))
      return { ...prev, [catId]: next }
    })
  }

  const handleConfirm = async () => {
    if (!customer || !event || items.length === 0) return
    setSaleLoading(true)
    setSaleError('')
    try {
      const ticketIds: string[] = []
      for (const item of items) {
        const payload: any = {
          eventId: event.id,
          categoryId: item.id,
          quantity: item.n,
          seatId: null,
          ...(customer.id === 'walk'
            ? { buyerName: 'Al portador' }
            : { buyerUserId: customer.id, buyerName: customer.name, buyerEmail: customer.email }),
        }
        const res = await api.post<any>('/tickets/presential', payload)
        ticketIds.push(res?.data?.id ?? res?.id ?? '')
      }
      setPayOpen(false)
      navigate('/confirmation', {
        state: {
          ticket_ids: ticketIds,
          customer_name: customer.id === 'walk' ? 'Al portador' : customer.name,
          customer_email: customer.id === 'walk' ? undefined : customer.email,
          event_name: event.name,
          event_date: event.date,
          items: items.map(i => ({ category_name: i.name, quantity: i.n, unit_price: i.price })),
          total: subtotal,
        },
      })
    } catch (err) {
      setSaleError(err instanceof Error ? err.message : 'Error al procesar la venta')
    } finally {
      setSaleLoading(false)
    }
  }

  const placeholders: Record<SearchMode, string> = {
    email: 'correo@ejemplo.com',
    cc: 'Número de cédula',
    name: 'Nombre del cliente',
  }

  return (
    <div className="pos">
      {/* Top bar */}
      <header className="pos-top">
        <div className="pos-brand">
          <div className="mark"><Star size={18} fill="currentColor" strokeWidth={0} /></div>
          Nova<b>Pass</b>
          <span className="sub">Taquilla</span>
        </div>
        <div className="pos-top-right">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Cambiar tema">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {user && (
            <div className="pos-cashier">
              <div className="av" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #7C3AED, #9333EA)',
                fontWeight: 700, fontSize: '0.78rem', color: '#fff', borderRadius: 11,
              }}>
                {initials(user.name)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{user.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Cajero/a</div>
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
        <div className="pos-main">
          {/* Step pills */}
          <div className="pos-steps">
            <StepPill n={1} label="Cliente" step={step} />
            <div className="pos-step-line" />
            <StepPill n={2} label="Evento" step={step} />
            <div className="pos-step-line" />
            <StepPill n={3} label="Boletas" step={step} />
          </div>

          {/* ── Step 1: Cliente ── */}
          {step === 1 && (
            <>
              <h2 className="pos-h">Buscar cliente</h2>
              <p className="pos-sub">Ubica al cliente por correo o cédula para asociar la compra a su cuenta.</p>

              <div className="pos-search-modes">
                {(['email', 'cc', 'name'] as SearchMode[]).map(m => (
                  <button key={m} className={searchMode === m ? 'on' : ''} onClick={() => setSearchMode(m)}>
                    {m === 'email' ? 'Correo' : m === 'cc' ? 'Cédula' : 'Nombre'}
                  </button>
                ))}
              </div>

              <div className="pos-search">
                <div className="field">
                  {searching
                    ? <span className="spinner" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, borderWidth: 2 }} />
                    : <Search size={19} />
                  }
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={placeholders[searchMode]}
                    autoFocus
                  />
                </div>
                {query && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setQuery('')}>
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="cust-list" style={{ marginTop: '1.2rem' }}>
                <div
                  className="cust-card cust-walkin"
                  onClick={() => pickCustomer({ id: 'walk', name: 'Venta sin registro', email: 'Cliente ocasional' })}
                >
                  <div className="av"><User size={22} /></div>
                  <div className="info">
                    <div className="nm">Venta sin registro</div>
                    <div className="meta"><span>Cliente ocasional — la entrada se emite al portador</span></div>
                  </div>
                  <div className="pick"><Check size={18} /></div>
                </div>

                {searchResults.map(c => (
                  <div key={c.id} className="cust-card" onClick={() => pickCustomer(c)}>
                    <div className="av" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, #7C3AED, #9333EA)',
                      fontWeight: 700, color: '#fff', fontSize: '0.9rem',
                    }}>
                      {initials(c.name)}
                    </div>
                    <div className="info">
                      <div className="nm">{c.name}</div>
                      <div className="meta">
                        <span>{c.email}</span>
                        {c.cc && <span>CC {c.cc}</span>}
                        {c.city && <span><MapPin size={13} />{c.city}</span>}
                      </div>
                    </div>
                    <div className="pick"><Check size={18} /></div>
                  </div>
                ))}

                {query.trim().length >= 3 && !searching && searchResults.length === 0 && (
                  <div className="pos-empty">
                    <Search size={32} />
                    <p>Sin resultados para "{query}". Usa "Venta sin registro" para continuar.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Step 2: Evento ── */}
          {step === 2 && (
            <>
              <h2 className="pos-h">Selecciona el evento</h2>
              <p className="pos-sub">Eventos con venta activa en taquilla.</p>

              {eventsLoading && (
                <div className="pos-empty">
                  <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto' }} />
                </div>
              )}

              <div className="pos-evgrid">
                {events.map(e => {
                  const d = fmtDay(e.date)
                  return (
                    <div
                      key={e.id}
                      className={`pos-evcard ${event?.id === e.id ? 'sel' : ''}`}
                      onClick={() => pickEvent(e)}
                    >
                      <div
                        className="img"
                        style={{
                          backgroundImage: e.image ? `url(${e.image})` : undefined,
                          background: !e.image ? 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))' : undefined,
                        }}
                      >
                        <div className="date">
                          <b>{d.day}</b>
                          <span>{d.mon}</span>
                        </div>
                      </div>
                      <div className="body">
                        <h4>{e.name}</h4>
                        {(e.venue || e.city) && (
                          <div className="mt">
                            <MapPin size={13} />
                            {[e.venue, e.city].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {!eventsLoading && events.length === 0 && (
                <div className="pos-empty">
                  <Music size={38} />
                  <p>No hay eventos activos en este momento</p>
                </div>
              )}
            </>
          )}

          {/* ── Step 3: Boletas ── */}
          {step === 3 && event && (
            <>
              <h2 className="pos-h">Categorías — {event.name}</h2>
              <p className="pos-sub">Selecciona la cantidad por categoría. Disponibilidad en tiempo real.</p>

              {saleError && (
                <div className="alert-error" style={{ marginBottom: '1rem' }}>{saleError}</div>
              )}

              <div className="cat-list">
                {event.categories.map(c => {
                  const soldout = c.available === 0
                  const cur = qty[c.id] ?? 0
                  return (
                    <div key={c.id} className={`cat-row ${soldout ? 'soldout' : ''}`}>
                      <div className="ci"><Ticket size={20} /></div>
                      <div className="cinfo">
                        <div className="cn">{c.name}</div>
                        <div className="ca">{soldout ? 'Agotada' : `${c.available} disponibles`}</div>
                      </div>
                      <div className="cprice">{cop(c.price)}</div>
                      {soldout
                        ? <span className="badge badge-error">Agotada</span>
                        : (
                          <div className="stepper">
                            <button onClick={() => changeQty(c.id, -1, c.available)} disabled={cur === 0}>
                              <Minus size={16} />
                            </button>
                            <span className="q">{cur}</span>
                            <button onClick={() => changeQty(c.id, 1, Math.min(c.available, 10))} disabled={cur >= Math.min(c.available, 10)}>
                              <Plus size={16} />
                            </button>
                          </div>
                        )
                      }
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Rail */}
        <CartRail
          customer={customer}
          event={event}
          items={items}
          totalQty={totalQty}
          subtotal={subtotal}
          setStep={setStep}
          onPay={() => { setSaleError(''); setPayOpen(true) }}
        />
      </div>

      {/* Pay modal */}
      {payOpen && (
        <PayModal
          total={subtotal}
          payMethod={payMethod}
          setPayMethod={setPayMethod}
          cashGiven={cashGiven}
          setCashGiven={setCashGiven}
          loading={saleLoading}
          onClose={() => setPayOpen(false)}
          onConfirm={handleConfirm}
        />
      )}

      {/* Broadcast toasts */}
      <div className="pos-toasts">
        {toasts.map(t => (
          <div key={t.id} className="pos-toast" onClick={() => dismiss(t.id)}>
            <div className="pt-title">{t.title}</div>
            <div className="pt-desc">{t.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
