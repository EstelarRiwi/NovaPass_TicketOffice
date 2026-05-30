import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { printReceipt } from '../api/printReceipt'
import { CheckCircle2, Printer, Plus, User, Calendar, Tag, Hash, Star, Mail, QrCode } from 'lucide-react'

interface SaleConfirmation {
  ticket_id:      string
  customer_name:  string
  customer_email?: string
  event_name:     string
  event_date:     string
  category_name:  string
  quantity:       number
  total:          number
}

const formatPrice = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

const formatTime = (d: string) =>
  new Date(d).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

export default function TicketConfirmation() {
  const navigate = useNavigate()
  const location = useLocation()
  const sale = location.state as SaleConfirmation | null

  const [printLoading, setPrintLoading] = useState(false)
  const [printError, setPrintError]     = useState('')

  useEffect(() => {
    if (!sale) navigate('/', { replace: true })
    else window.history.replaceState({}, document.title)
  }, [sale, navigate])

  if (!sale) return null

  const handlePrint = async () => {
    setPrintLoading(true)
    setPrintError('')
    try {
      await printReceipt(sale)
    } catch (e: unknown) {
      setPrintError(e instanceof Error ? e.message : 'Error al imprimir')
    } finally {
      setPrintLoading(false)
    }
  }

  return (
    <div className="print-overlay">
      <div className="print-shell">
        {/* Success banner */}
        <div className="print-success">
          <div className="pc"><CheckCircle2 size={22} strokeWidth={3} /></div>
          Venta registrada · {sale.ticket_id}
        </div>

        {/* Ticket card */}
        <div className="pticket" id="pticket">
          <div className="pticket-top">
            <div className="brand">
              <Star size={16} fill="currentColor" strokeWidth={0} />
              NovaPass · Entrada oficial
            </div>
            <div className="ev">{sale.event_name}</div>
            <div className="vn">{formatDate(sale.event_date)} · {formatTime(sale.event_date)}</div>
          </div>

          <div className="pticket-body">
            <div className="pticket-grid">
              <div>
                <div className="k"><User size={10} style={{ display: 'inline', marginRight: 3 }} />Titular</div>
                <div className="v">{sale.customer_name}</div>
              </div>
              <div>
                <div className="k"><Tag size={10} style={{ display: 'inline', marginRight: 3 }} />Categoría</div>
                <div className="v">{sale.category_name}</div>
              </div>
              <div>
                <div className="k"><Calendar size={10} style={{ display: 'inline', marginRight: 3 }} />Fecha</div>
                <div className="v">{new Date(sale.event_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</div>
              </div>
              <div>
                <div className="k"><Hash size={10} style={{ display: 'inline', marginRight: 3 }} />Cantidad</div>
                <div className="v">{sale.quantity} boleta{sale.quantity > 1 ? 's' : ''}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="k">Total</div>
                <div className="v" style={{ color: 'var(--color-primary)', fontSize: '1.1rem' }}>{formatPrice(sale.total)}</div>
              </div>
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
            <div className="code-num">{sale.ticket_id}</div>
          </div>
        </div>

        {/* Email notice */}
        {sale.customer_email && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem', fontWeight: 500,
          }}>
            <Mail size={14} />
            Boleta enviada a {sale.customer_email}
          </div>
        )}

        {/* Error */}
        {printError && (
          <div className="alert-error" style={{ maxWidth: 360 }}>{printError}</div>
        )}

        {/* Actions */}
        <div className="print-actions">
          <button className="btn btn-glass btn-lg" onClick={() => navigate('/')}>
            <Plus size={18} /> Nueva venta
          </button>
          <button className="btn btn-cta btn-lg" onClick={handlePrint} disabled={printLoading}>
            {printLoading
              ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
              : <><Printer size={18} /> Imprimir entrada</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
