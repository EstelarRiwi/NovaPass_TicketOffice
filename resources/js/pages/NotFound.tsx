import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Compass } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(147,51,234,0.12) 0%, transparent 70%)',
        top: '-10%', left: '-10%', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
        bottom: '5%', right: '5%', pointerEvents: 'none',
      }} />

      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: 'clamp(6rem, 20vw, 9rem)',
          fontFamily: 'var(--font-heading)',
          lineHeight: 1,
          background: 'linear-gradient(135deg, #9333EA 0%, #C084FC 60%, #F59E0B 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '1.5rem',
          filter: 'drop-shadow(0 0 32px rgba(147, 51, 234, 0.4))',
        }}>
          404
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Compass size={20} style={{ color: '#C084FC' }} />
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text)' }}>Página no encontrada</h2>
        </div>

        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem', marginBottom: '2rem', lineHeight: 1.6 }}>
          Esta ruta no existe en el punto de venta.
        </p>

        <button
          onClick={() => navigate('/')}
          className="btn btn-primary btn-lg"
          style={{ gap: '0.5rem' }}
        >
          <ShoppingBag size={18} />
          Volver a ventas
        </button>
      </div>
    </div>
  )
}
