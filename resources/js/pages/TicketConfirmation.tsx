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

        {sale.customer_email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem', fontWeight: 500 }}>
            <Mail size={14} />
            Boleta enviada a {sale.customer_email}
          </div>
        )}

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
