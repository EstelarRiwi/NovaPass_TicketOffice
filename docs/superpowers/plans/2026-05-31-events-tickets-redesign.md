# events_tickets Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current single-scroll SaleForm with the full 3-step POS redesign from `rediseño/Taquilla/`, add dark mode toggle, and add real-time category availability via SignalR + broadcast seller notifications.

**Architecture:** Step-driven POS (`step` 1→2→3 state), multi-category `qty` dict, PayModal before API call. SignalR `CategoryAvailabilityUpdate` broadcast keeps available counts live across all seller terminals. `useTheme` toggles `html.dark` class for CSS-variable dark override.

**Tech Stack:** React 19 + TypeScript + Vite 8 + lucide-react · @microsoft/signalr · ASP.NET Core SignalR (existing hub) · global.css design tokens (light purple palette, existing)

---

## File Map

| File | Action |
|---|---|
| `resources/js/hooks/useTheme.ts` | **Create** — localStorage `theme` key, toggles `html.dark` |
| `resources/js/hooks/useAvailability.ts` | **Create** — SignalR subscription for `CategoryAvailabilityUpdate` |
| `resources/js/hooks/useNotifications.ts` | **Create** — SignalR subscription for seller broadcast toasts |
| `resources/js/pages/SaleForm.tsx` | **Rewrite** — full 3-step POS matching redesign |
| `resources/js/pages/TicketConfirmation.tsx` | **Modify** — support multi-item `items[]` sale data |
| `resources/js/styles/global.css` | **Modify** — add dark mode token block + theme toggle CSS |
| `resources/js/api/client.ts` | **Modify** — add `patch` method |
| `NovaPass_API/DTOs/Tickets/PresentialSaleDTOs.cs` | **Modify** — add `CategoryAvailabilityPayload` record |
| `NovaPass_API/Services/TicketsService.cs` | **Modify** — broadcast availability after presential sale |
| `Dockerfile` | **Modify** — add `VITE_WS_URL` build arg |
| `.github/workflows/deploy.yml` | **Modify** — pass `VITE_WS_URL` in docker build |

---

## Task 1: Install @microsoft/signalr + add VITE_WS_URL

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `Dockerfile`
- Modify: `.github/workflows/deploy.yml`
- Modify: `resources/js/vite-env.d.ts`

- [ ] **Step 1: Install SignalR client**

```bash
cd /home/alyxzain/Escritorio/NovaPass_laravel/events_tickets
npm install @microsoft/signalr
```

Expected: `node_modules/@microsoft/signalr` present, `package.json` updated.

- [ ] **Step 2: Declare VITE_WS_URL env type**

In `resources/js/vite-env.d.ts`, add inside the `ImportMetaEnv` interface:

```typescript
readonly VITE_WS_URL: string | undefined
```

Full file after edit:
```typescript
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL: string | undefined
  readonly VITE_WS_URL: string | undefined
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

- [ ] **Step 3: Add VITE_WS_URL to Dockerfile**

In `Dockerfile`, after the existing `ARG VITE_API_URL` / `ENV VITE_API_URL` block, add:

```dockerfile
ARG VITE_WS_URL
ENV VITE_WS_URL=${VITE_WS_URL:-http://localhost:5000}
```

The block should look like:
```dockerfile
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL:-http://localhost:5000/api}

ARG VITE_WS_URL
ENV VITE_WS_URL=${VITE_WS_URL:-http://localhost:5000}
```

- [ ] **Step 4: Pass VITE_WS_URL in deploy.yml**

In `.github/workflows/deploy.yml`, find the `docker build` command and add the new arg:

```yaml
      - name: Build and push Docker image
        run: |
          docker build -f Dockerfile \
            --build-arg VITE_API_URL=https://api.estelar.andrescortes.dev/api \
            --build-arg VITE_WS_URL=https://api.estelar.andrescortes.dev \
            -t ${{ env.IMAGE_TAG }} .
          docker push ${{ env.IMAGE_TAG }}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: build completes without errors.

---

## Task 2: useTheme hook + dark mode CSS + theme toggle button

**Files:**
- Create: `resources/js/hooks/useTheme.ts`
- Modify: `resources/js/styles/global.css`

- [ ] **Step 1: Create useTheme hook**

Create `resources/js/hooks/useTheme.ts`:

```typescript
import { useState, useEffect } from 'react'

export type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) ?? 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  return { theme, toggle }
}
```

- [ ] **Step 2: Add dark mode CSS variables block to global.css**

At the end of the `:root` block (after `--ease: ...`) and before the `*, *::before` reset, add a dark mode override block. Append to `resources/js/styles/global.css` after the existing `@media (prefers-reduced-motion: reduce)` block:

```css
/* ============================================================
   Dark mode overrides — activated by html.dark
   ============================================================ */
html.dark {
  --color-bg: #0F0D1A;
  --color-bg-alt: #1A1828;
  --color-surface: #1A1828;
  --color-text: #EDE9FE;
  --color-text-secondary: #C084FC;
  --color-text-muted: #7C7A99;
  --color-border: rgba(147, 51, 234, 0.2);
  --color-primary: #9333EA;
  --color-primary-light: #C084FC;
  --color-primary-dark: #7C3AED;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.5);
}

html.dark body {
  background: var(--color-bg);
  color: var(--color-text);
}

html.dark input,
html.dark textarea,
html.dark select {
  background: var(--color-bg-alt);
  color: var(--color-text);
  border-color: var(--color-border);
}

html.dark input::placeholder { color: #4a4870; }

html.dark .pticket { background: #1A1828; }
html.dark .pticket-grid .k { color: var(--color-text-muted); }
html.dark .pticket-grid .v { color: var(--color-text); }

/* Theme toggle button */
.theme-toggle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--color-bg-alt);
  border: 1.5px solid var(--color-border);
  color: var(--color-text-muted);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background .2s ease, color .2s ease, border-color .2s ease;
  flex: none;
}
.theme-toggle:hover {
  background: var(--color-surface);
  color: var(--color-primary);
  border-color: var(--color-primary-light);
}
```

- [ ] **Step 3: Verify dark mode visually**

Open `npm run dev` and manually call `document.documentElement.classList.add('dark')` in the browser console. All backgrounds should flip to dark purple/navy tones. Input fields should have dark bg.

---

## Task 3: Rewrite SaleForm.tsx — full 3-step POS

**Files:**
- Modify: `resources/js/pages/SaleForm.tsx` (full rewrite)

This is the main redesign. Replace the entire file with the 3-step flow matching `rediseño/Taquilla/app.jsx` exactly, wired to the real API.

- [ ] **Step 1: Write the full SaleForm.tsx**

Replace `resources/js/pages/SaleForm.tsx` entirely:

```tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../hooks/useTheme'
import { api } from '../api/client'
import {
  Search, X, User, Users, LogOut, Star, ShoppingCart,
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
  const METHODS = [
    { id: 'cash' as PayMethod,     nm: 'Efectivo',            ds: 'Pago en caja',                  Icon: Banknote },
    { id: 'card' as PayMethod,     nm: 'Tarjeta',             ds: 'Datáfono · débito o crédito',   Icon: CreditCard },
    { id: 'transfer' as PayMethod, nm: 'Transferencia / QR',  ds: 'Nequi, Bancolombia',            Icon: QrCode },
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
                className="pay-radio"
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
  customer, event, items, totalQty, subtotal,
  setStep, onPay,
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
            <button
              className="change"
              onClick={e => { e.preventDefault(); setStep(1) }}
            >
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
          className="btn btn-cta btn-lg btn-block rail-pay"
          disabled={items.length === 0 || !customer}
          onClick={onPay}
          style={{ marginTop: '1.1rem' }}
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

  // Step state
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
    ? event.categories
        .filter(c => (qty[c.id] ?? 0) > 0)
        .map(c => ({ ...c, n: qty[c.id] }))
    : []
  const subtotal = items.reduce((s, i) => s + i.price * i.n, 0)
  const totalQty = items.reduce((s, i) => s + i.n, 0)

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

  // Search customers
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

  // Customer pick
  const pickCustomer = (c: Customer) => { setCustomer(c); setStep(2) }

  const clearCustomer = () => {
    setQuery('')
    setSearchResults([])
    setCustomer(null)
  }

  // Event pick
  const pickEvent = (e: Event) => { setEvent(e); setQty({}); setStep(3) }

  // Qty stepper
  const changeQty = (catId: string, delta: number, max: number) => {
    setQty(prev => {
      const cur = prev[catId] ?? 0
      const next = Math.max(0, Math.min(max, cur + delta))
      return { ...prev, [catId]: next }
    })
  }

  // Handle sell
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
          items: items.map(i => ({
            category_name: i.name,
            quantity: i.n,
            unit_price: i.price,
          })),
          total: subtotal,
        },
      })
    } catch (err) {
      setSaleError(err instanceof Error ? err.message : 'Error al procesar la venta')
    } finally {
      setSaleLoading(false)
    }
  }

  const reset = () => {
    setStep(1); setQuery(''); setCustomer(null); setEvent(null); setQty({})
    setPayOpen(false); setPayMethod('cash'); setCashGiven(''); setSaleError('')
  }

  const placeholders: Record<SearchMode, string> = {
    email: 'correo@ejemplo.com',
    cc: 'Número de cédula',
    name: 'Nombre del cliente',
  }

  // ── Render ─────────────────────────────────────────────────────────────────
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
        {/* Main area */}
        <div className="pos-main">
          {/* Step pills */}
          <div className="pos-steps">
            <StepPill n={1} label="Cliente" step={step} />
            <div className="pos-step-line" />
            <StepPill n={2} label="Evento" step={step} />
            <div className="pos-step-line" />
            <StepPill n={3} label="Boletas" step={step} />
          </div>

          {/* ── Step 1: Cliente ────────────────────────────────── */}
          {step === 1 && (
            <>
              <h2 className="pos-h">Buscar cliente</h2>
              <p className="pos-sub">Ubica al cliente por correo o cédula para asociar la compra a su cuenta.</p>

              <div className="pos-search-modes">
                {(['email', 'cc', 'name'] as SearchMode[]).map(m => (
                  <button
                    key={m}
                    className={searchMode === m ? 'on' : ''}
                    onClick={() => setSearchMode(m)}
                  >
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
                {/* Walk-in always at top */}
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

                {/* Search results */}
                {searchResults.map(c => (
                  <div
                    key={c.id}
                    className="cust-card"
                    onClick={() => pickCustomer(c)}
                  >
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

                {/* No results */}
                {query.trim().length >= 3 && !searching && searchResults.length === 0 && (
                  <div className="pos-empty">
                    <Search size={32} />
                    <p>Sin resultados para "{query}". Usa "Venta sin registro" para continuar.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Step 2: Evento ─────────────────────────────────── */}
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

          {/* ── Step 3: Boletas ────────────────────────────────── */}
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
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

```bash
npm run build
```

Expected: no TypeScript errors. If there are import errors, verify all lucide-react icon names are spelled correctly (`Banknote`, `CreditCard`, `QrCode`, `Moon`, `Sun`, `Music`, `MapPin` are all in lucide-react v1.x).

---

## Task 4: Update TicketConfirmation for multi-item sales

**Files:**
- Modify: `resources/js/pages/TicketConfirmation.tsx`

The navigation payload from the new SaleForm sends `items[]` instead of `category_name + quantity`. Update TicketConfirmation to handle this.

- [ ] **Step 1: Rewrite TicketConfirmation.tsx**

Replace `resources/js/pages/TicketConfirmation.tsx` entirely:

```tsx
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle2, Printer, Plus, User, Calendar, Tag, Hash, Star, Mail, QrCode } from 'lucide-react'

interface SaleItem {
  category_name: string
  quantity: number
  unit_price: number
}

interface SaleConfirmation {
  ticket_ids:      string[]
  customer_name:   string
  customer_email?: string
  event_name:      string
  event_date:      string
  items:           SaleItem[]
  total:           number
}

const cop = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export default function TicketConfirmation() {
  const navigate = useNavigate()
  const location = useLocation()
  const sale = location.state as SaleConfirmation | null

  useEffect(() => {
    if (!sale) navigate('/', { replace: true })
    else window.history.replaceState({}, document.title)
  }, [sale, navigate])

  if (!sale) return null

  const totalQty = sale.items.reduce((s, i) => s + i.quantity, 0)
  const firstRef = sale.ticket_ids[0] ?? 'NVP-?'

  const dt = new Date(sale.event_date)
  const dayStr = dt.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
  const timeStr = dt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="print-overlay">
      <div className="print-shell">
        {/* Success banner */}
        <div className="print-success">
          <div className="pc"><CheckCircle2 size={22} strokeWidth={3} /></div>
          Venta registrada · {firstRef}
        </div>

        {/* Ticket card */}
        <div className="pticket" id="pticket">
          <div className="pticket-top">
            <div className="brand">
              <Star size={16} fill="currentColor" strokeWidth={0} />
              NovaPass · Entrada oficial
            </div>
            <div className="ev">{sale.event_name}</div>
            <div className="vn">
              {dt.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}{timeStr}
            </div>
          </div>

          <div className="pticket-body">
            <div className="pticket-grid">
              <div>
                <div className="k"><User size={10} style={{ display: 'inline', marginRight: 3 }} />Titular</div>
                <div className="v">{sale.customer_name}</div>
              </div>
              <div>
                <div className="k"><Calendar size={10} style={{ display: 'inline', marginRight: 3 }} />Fecha</div>
                <div className="v">{dayStr}</div>
              </div>
              <div>
                <div className="k"><Hash size={10} style={{ display: 'inline', marginRight: 3 }} />Cantidad</div>
                <div className="v">{totalQty} boleta{totalQty > 1 ? 's' : ''}</div>
              </div>
              <div>
                <div className="k">Total</div>
                <div className="v" style={{ color: 'var(--color-primary)', fontSize: '1.05rem' }}>{cop(sale.total)}</div>
              </div>

              {/* One row per category */}
              {sale.items.map((item, i) => (
                <div key={i} style={{ gridColumn: '1 / -1' }}>
                  <div className="k"><Tag size={10} style={{ display: 'inline', marginRight: 3 }} />{item.category_name}</div>
                  <div className="v">{item.quantity} × {cop(item.unit_price)}</div>
                </div>
              ))}
            </div>

            <div className="pticket-qr">
              <div style={{ padding: 8, border: '2px solid var(--color-border)', borderRadius: 12 }}>
                <QrCode size={116} strokeWidth={1.5} style={{ display: 'block', color: 'var(--color-text)' }} />
              </div>
              <div className="lbl">Escanea en el acceso del evento</div>
            </div>
          </div>

          <div className="pticket-perf"><div className="line" /></div>

          <div className="pticket-barcode">
            <div className="code-num">{firstRef}</div>
          </div>
        </div>

        {/* Email notice */}
        {sale.customer_email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem', fontWeight: 500 }}>
            <Mail size={14} />
            Boleta enviada a {sale.customer_email}
          </div>
        )}

        {/* Actions */}
        <div className="print-actions">
          <button className="btn btn-glass btn-lg" onClick={() => navigate('/')}>
            <Plus size={18} /> Nueva venta
          </button>
          <button className="btn btn-cta btn-lg" onClick={() => window.print()}>
            <Printer size={18} /> Imprimir entrada
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: no TypeScript errors.

---

## Task 5: useAvailability hook

**Files:**
- Create: `resources/js/hooks/useAvailability.ts`

Receives real-time `CategoryAvailabilityUpdate` events from SignalR and calls a callback to mutate category state.

- [ ] **Step 1: Create the hook**

Create `resources/js/hooks/useAvailability.ts`:

```typescript
import { useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'

interface AvailabilityUpdate {
  eventId:    string
  categoryId: string
  available:  number
}

export function useAvailability(
  wsBaseUrl: string | null,
  onUpdate: (eventId: string, categoryId: string, available: number) => void
) {
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => { onUpdateRef.current = onUpdate }, [onUpdate])

  useEffect(() => {
    if (!wsBaseUrl) return

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${wsBaseUrl}/hubs/notifications`, {
        accessTokenFactory: () => localStorage.getItem('token') ?? '',
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('CategoryAvailabilityUpdate', (payload: AvailabilityUpdate) => {
      onUpdateRef.current(payload.eventId, payload.categoryId, payload.available)
    })

    conn.start().catch(err => console.warn('Availability WS connect failed:', err))

    return () => { conn.stop() }
  }, [wsBaseUrl])
}
```

- [ ] **Step 2: Wire useAvailability into SaleForm**

In `SaleForm.tsx`, add the import and hook call. Add after the existing hooks:

```typescript
import { useAvailability } from '../hooks/useAvailability'
```

Inside the `SaleForm` component, after the existing state declarations, add:

```typescript
const wsBaseUrl = (import.meta.env.VITE_WS_URL as string | undefined) ?? null

useAvailability(wsBaseUrl, (eventId, categoryId, available) => {
  setEvents(prev => prev.map(ev => {
    if (ev.id !== eventId) return ev
    return {
      ...ev,
      categories: ev.categories.map(c =>
        c.id === categoryId ? { ...c, available } : c
      ),
    }
  }))
  // Also patch the selected event if it's the same
  setEvent(prev => {
    if (!prev || prev.id !== eventId) return prev
    return {
      ...prev,
      categories: prev.categories.map(c =>
        c.id === categoryId ? { ...c, available } : c
      ),
    }
  })
})
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: no TypeScript errors.

---

## Task 6: Backend — broadcast CategoryAvailabilityUpdate

**Files:**
- Modify: `NovaPass_API/DTOs/Tickets/PresentialSaleDTOs.cs`
- Modify: `NovaPass_API/Services/TicketsService.cs`

- [ ] **Step 1: Find the PresentialSaleDTOs file**

```bash
find /home/alyxzain/Escritorio/NovaPass_laravel/NovaPass_API/DTOs -name "*.cs" | xargs grep -l "PresentialSale\|Presential" 2>/dev/null
```

If the record is elsewhere, read `NovaPass_API/DTOs/` to locate it. Then add the new payload record next to the existing ones.

- [ ] **Step 2: Add CategoryAvailabilityPayload record**

In the file that contains `PresentialSaleRequest` (or `PresentialSaleDTOs.cs`), add:

```csharp
public record CategoryAvailabilityPayload(
    [property: JsonPropertyName("eventId")]    string EventId,
    [property: JsonPropertyName("categoryId")] string CategoryId,
    [property: JsonPropertyName("available")]  int Available
);
```

Ensure the file has `using System.Text.Json.Serialization;` at the top.

- [ ] **Step 3: Broadcast availability after CreatePresentialTicketAsync**

In `NovaPass_API/Services/TicketsService.cs`, find the end of `CreatePresentialTicketAsync` after `await transaction.CommitAsync()` and before `await PublishN8nAsync(...)`:

```csharp
await transaction.CommitAsync();

// Fire-and-forget: broadcast updated availability to all sellers
_ = Task.Run(() => hub.Clients.All.SendAsync("CategoryAvailabilityUpdate",
    new CategoryAvailabilityPayload(
        request.EventId,
        request.CategoryId,
        category.AvailableCapacity)));

await PublishN8nAsync("ticket_vendido_presencial", new { ... });
```

Note: `hub` is the `IHubContext<NotificationHub>` already injected in the constructor. `category.AvailableCapacity` already holds the decremented value at this point (it was set on line ~269 before SaveChanges).

- [ ] **Step 4: Verify build**

```bash
cd /home/alyxzain/Escritorio/NovaPass_laravel/NovaPass_API
dotnet build -p:AllowMissingPrunePackageData=true
```

Expected: Build succeeded. No new errors (pre-existing CS8604 nullable warning is OK).

---

## Task 7: useNotifications hook — seller broadcast toasts

**Files:**
- Create: `resources/js/hooks/useNotifications.ts`
- Modify: `resources/js/styles/global.css`

Sellers receive admin broadcast notifications as auto-dismiss toasts. No bell icon needed in the POS.

- [ ] **Step 1: Create the hook**

Create `resources/js/hooks/useNotifications.ts`:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'

export interface PosNotif {
  id: string
  title: string
  desc: string
  type: string
}

export function useNotifications(wsBaseUrl: string | null, userId: string | null) {
  const [toasts, setToasts] = useState<PosNotif[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(n => n.id !== id))
  }, [])

  useEffect(() => {
    if (!wsBaseUrl || !userId) return

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${wsBaseUrl}/hubs/notifications`, {
        accessTokenFactory: () => localStorage.getItem('token') ?? '',
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('ReceiveNotification', (payload: { id?: string; title: string; desc: string; type: string }) => {
      const notif: PosNotif = {
        id: payload.id ?? crypto.randomUUID(),
        title: payload.title,
        desc: payload.desc,
        type: payload.type,
      }
      setToasts(prev => [notif, ...prev].slice(0, 5))
      setTimeout(() => {
        setToasts(cur => cur.filter(n => n.id !== notif.id))
      }, 5000)
    })

    conn.start().catch(err => console.warn('Notifications WS connect failed:', err))
    return () => { conn.stop() }
  }, [wsBaseUrl, userId])

  return { toasts, dismiss }
}
```

- [ ] **Step 2: Add toast CSS to global.css**

Append to `resources/js/styles/global.css`:

```css
/* ============================================================
   POS toast notifications
   ============================================================ */
.pos-toasts {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  pointer-events: none;
}
.pos-toast {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-left: 4px solid var(--color-primary);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
  box-shadow: var(--shadow-md);
  max-width: 320px;
  pointer-events: all;
  animation: rise .3s var(--ease) both;
}
.pos-toast .pt-title { font-weight: 700; font-size: 0.88rem; color: var(--color-text); }
.pos-toast .pt-desc  { font-size: 0.78rem; color: var(--color-text-muted); margin-top: 0.15rem; }
```

- [ ] **Step 3: Render toasts + wire hook in SaleForm**

In `SaleForm.tsx`:

1. Add import:
```typescript
import { useNotifications } from '../hooks/useNotifications'
```

2. Inside `SaleForm` component, after `useAvailability`:
```typescript
const { toasts, dismiss } = useNotifications(wsBaseUrl, user?.id ?? null)
```

3. Inside the returned JSX, after the `</div>` that closes the `pos` root and before the final closing, add the toast container (just before the last `</div>`):
```tsx
{/* Toasts */}
<div className="pos-toasts">
  {toasts.map(t => (
    <div key={t.id} className="pos-toast" onClick={() => dismiss(t.id)}>
      <div className="pt-title">{t.title}</div>
      <div className="pt-desc">{t.desc}</div>
    </div>
  ))}
</div>
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: no TypeScript errors.

---

## Task 8: api/client.ts — add patch method

**Files:**
- Modify: `resources/js/api/client.ts`

The notifications hooks on landing use `api.patch`, so we need it in tickets too for consistency. Even if not used by tickets right now, it keeps the clients in sync.

- [ ] **Step 1: Add patch to api**

In `resources/js/api/client.ts`, change the `export const api` block to:

```typescript
export const api = {
  get:    <T>(path: string)                  => request<T>('GET',    path),
  post:   <T>(path: string, body: unknown)   => request<T>('POST',   path, body),
  put:    <T>(path: string, body: unknown)   => request<T>('PUT',    path, body),
  patch:  <T>(path: string, body?: unknown)  => request<T>('PATCH',  path, body),
  delete: <T>(path: string)                  => request<T>('DELETE', path),
}
```

---

## Task 9: Smoke test + commit

**Files:** none (test + git)

- [ ] **Step 1: Start dev server**

```bash
cd /home/alyxzain/Escritorio/NovaPass_laravel/events_tickets
npm run dev
```

Open `http://localhost:5173` (or whatever port Vite assigns).

- [ ] **Step 2: Test golden path**

Manual checklist:
- [ ] Login page renders (with theme toggle visible)
- [ ] After login, POS loads in Step 1
- [ ] Mode tabs switch placeholder text
- [ ] Walkin card is always visible
- [ ] Searching 3+ chars calls API and shows result cards
- [ ] Clicking a customer or walkin advances to Step 2
- [ ] Step 2 shows event grid with date badges
- [ ] Clicking an event advances to Step 3
- [ ] Step 3 shows category rows with independent steppers
- [ ] Soldout categories show "Agotada" badge, stepper hidden
- [ ] CartRail shows customer name, event name, added items, totals
- [ ] "Cobrar" button disabled when no items selected
- [ ] Clicking "Cobrar" opens PayModal with 3 payment method options
- [ ] Cash calculator shows change correctly
- [ ] Confirming payment calls API and navigates to TicketConfirmation
- [ ] TicketConfirmation shows multi-item grid
- [ ] "Imprimir entrada" calls `window.print()`
- [ ] "Nueva venta" resets to Step 1
- [ ] Theme toggle switches between light and dark
- [ ] Dark mode: all backgrounds flip, inputs dark, pticket readable

- [ ] **Step 3: Commit frontend changes**

```bash
cd /home/alyxzain/Escritorio/NovaPass_laravel/events_tickets
git add resources/js/hooks/useTheme.ts resources/js/hooks/useAvailability.ts resources/js/hooks/useNotifications.ts resources/js/pages/SaleForm.tsx resources/js/pages/TicketConfirmation.tsx resources/js/styles/global.css resources/js/api/client.ts resources/js/vite-env.d.ts Dockerfile .github/workflows/deploy.yml package.json package-lock.json
git commit -m "redesign: 3-step POS UI, dark mode, real-time availability via SignalR"
```

- [ ] **Step 4: Commit API changes**

```bash
cd /home/alyxzain/Escritorio/NovaPass_laravel/NovaPass_API
git add Services/TicketsService.cs DTOs/Tickets/
git commit -m "broadcast CategoryAvailabilityUpdate after presential ticket sale"
```

---

## Task 10: Deploy to production

**Prerequisites:** All commits pushed, CI/CD configured.

- [ ] **Step 1: Push events_tickets to main**

```bash
cd /home/alyxzain/Escritorio/NovaPass_laravel/events_tickets
git push origin main
```

GitHub Actions will build the Docker image with both `VITE_API_URL` and `VITE_WS_URL`, push to GHCR, then SSH-deploy to the VPS at port 9002.

- [ ] **Step 2: Push API changes**

```bash
cd /home/alyxzain/Escritorio/NovaPass_laravel/NovaPass_API
git push origin main
```

API CI/CD redeploys to VPS port 8080.

- [ ] **Step 3: Verify production**

Open `https://tickets.estelar.andrescortes.dev` (or the mapped domain for port 9002) and repeat the smoke test checklist from Task 9 Step 2.

Specific production checks:
- [ ] SignalR connects (no CORS errors in browser console)
- [ ] Open two seller windows: sell a ticket in window A → category available count updates in window B within 2 seconds
- [ ] Admin broadcasts a notification → seller sees toast appear and auto-dismiss after 5 seconds

---

## WebSocket note

Both `useAvailability` and `useNotifications` connect to the **same** `/hubs/notifications` hub. In production this means one hub, two `conn.on` subscriptions. If you want to avoid two separate WS connections, merge them into a single hook later — but for now two connections is fine and keeps them decoupled.

The hub requires authentication (`[Authorize]`). Unauthenticated sellers (not logged in) get no connection — which is correct behavior since they can't reach the POS anyway.
