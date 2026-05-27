import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { printReceipt } from '../api/printReceipt'
import {
  CheckCircle2, Printer, Plus, User, Calendar, Tag, Hash,
  Zap, Mail,
} from 'lucide-react'

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
    hour: '2-digit', minute: '2-digit',
  })

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

  const rows: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <User size={15} />,     label: 'Cliente',    value: sale.customer_name },
    { icon: <Calendar size={15} />, label: 'Evento',     value: sale.event_name },
    { icon: <Tag size={15} />,      label: 'Fecha',      value: formatDate(sale.event_date) },
    { icon: <Tag size={15} />,      label: 'Categoría',  value: sale.category_name },
    { icon: <Hash size={15} />,     label: 'Cantidad',   value: `${sale.quantity} boleta${sale.quantity > 1 ? 's' : ''}` },
  ]

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'radial-gradient(ellipse 80% 60% at 50% 10%, rgba(34,197,94,0.15) 0%, #0A0A0F 60%), #0A0A0F',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1.5rem',
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem',
        fontFamily: 'var(--font-heading)', fontSize: '1.125rem',
        color: 'var(--color-primary-light)', opacity: 0.7,
      }}>
        <Zap size={18} fill="currentColor" /> NovaPass
      </div>

      <div style={{ width: '100%', maxWidth: 440 }} className="slide-in-up">

        {/* ── Icon ── */}
        <div style={{
          display: 'flex', justifyContent: 'center', marginBottom: '1.75rem',
          position: 'relative',
        }}>
          <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute', inset: -18, borderRadius: '50%',
              border: '2px solid rgba(74,222,128,0.2)',
              animation: 'pulse-ring 2.2s ease-out infinite',
            }} />
            <div style={{
              position: 'absolute', inset: -4, borderRadius: '50%',
              border: '2px solid rgba(74,222,128,0.35)',
              animation: 'pulse-ring 2.2s ease-out infinite 0.6s',
            }} />
            <div style={{
              width: 110, height: 110, borderRadius: '50%',
              background: 'rgba(34,197,94,0.1)',
              border: '2px solid rgba(34,197,94,0.4)',
              boxShadow: '0 0 48px rgba(34,197,94,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle2 size={56} color="#4ADE80" />
            </div>
          </div>
        </div>

        {/* ── Headline ── */}
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(2rem, 6vw, 2.75rem)',
          color: '#4ADE80',
          textShadow: '0 0 40px rgba(74,222,128,0.5)',
          textAlign: 'center',
          marginBottom: '0.5rem',
        }}>
          ¡Venta Exitosa!
        </h1>
        <p style={{
          textAlign: 'center', color: 'var(--color-text-muted)',
          fontSize: '1rem', marginBottom: '2rem',
        }}>
          La boleta ha sido registrada correctamente
        </p>

        {/* ── Details card ── */}
        <div style={{
          background: 'rgba(34,197,94,0.05)',
          border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 'var(--radius-lg)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          padding: '1.5rem',
          marginBottom: '1.25rem',
          display: 'flex', flexDirection: 'column', gap: '0.875rem',
        }}>
          {rows.map((row, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
              paddingBottom: i < rows.length - 1 ? '0.875rem' : 0,
              borderBottom: i < rows.length - 1 ? '1px solid rgba(34,197,94,0.1)' : 'none',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(34,197,94,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#4ADE80',
              }}>
                {row.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.125rem' }}>
                  {row.label}
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                  {row.value}
                </div>
              </div>
            </div>
          ))}

          {/* Total */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: '0.25rem', paddingTop: '0.875rem',
            borderTop: '1px solid rgba(34,197,94,0.15)',
          }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Total pagado</span>
            <span style={{
              fontFamily: 'var(--font-heading)', fontSize: '1.625rem',
              color: 'var(--color-cta)',
              textShadow: '0 0 16px rgba(245,158,11,0.35)',
            }}>
              {formatPrice(sale.total)}
            </span>
          </div>
        </div>

        {/* Email notice */}
        {sale.customer_email && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1rem',
            background: 'rgba(147,51,234,0.08)', border: '1px solid rgba(147,51,234,0.2)',
            borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem',
            fontSize: '0.8125rem', color: 'var(--color-primary-light)',
          }}>
            <Mail size={14} />
            Boleta enviada a {sale.customer_email}
          </div>
        )}

        {/* Error */}
        {printError && (
          <div className="alert-error" style={{ marginBottom: '1rem' }}>{printError}</div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={handlePrint}
            disabled={printLoading}
          >
            {printLoading
              ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
              : <><Printer size={20} /> Imprimir PDF</>
            }
          </button>
          <button
            className="btn btn-cta btn-lg"
            onClick={() => navigate('/')}
          >
            <Plus size={20} /> Nueva Venta
          </button>
        </div>
      </div>
    </div>
  )
}
