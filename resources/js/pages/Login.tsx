import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { LogIn, ShoppingBag, Tag, Star } from 'lucide-react'

export default function Login() {
  const { login, loading } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    }
  }

  return (
    <div style={{
      position: 'relative',
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      overflow: 'hidden',
      padding: '2rem 1.5rem',
    }}>
      <div style={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(147, 51, 234, 0.2) 0%, transparent 70%)',
        top: -200, right: -180, pointerEvents: 'none',
        animation: 'float 9s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245, 158, 11, 0.09) 0%, transparent 70%)',
        bottom: -120, left: -100, pointerEvents: 'none',
        animation: 'float-reverse 12s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', width: 280, height: 280, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(147, 51, 234, 0.1) 0%, transparent 70%)',
        bottom: '30%', right: '10%', pointerEvents: 'none',
        animation: 'float 14s ease-in-out infinite 3s',
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }} className="slide-in-up">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.625rem',
            fontFamily: 'var(--font-display)', fontSize: '2.25rem',
            color: 'var(--color-primary)',
          }}>
            <Star size={30} fill="currentColor" strokeWidth={0} />
            NovaPass
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(147, 51, 234, 0.1)',
            border: '1px solid rgba(147, 51, 234, 0.25)',
            borderRadius: '999px', padding: '0.375rem 0.875rem',
            fontSize: '0.75rem', color: 'var(--color-text-muted)',
            letterSpacing: '0.05em', textTransform: 'uppercase' as const,
          }}>
            <ShoppingBag size={12} />
            Punto de Venta
          </div>
        </div>

        <div className="card" style={{ padding: '2rem 2rem 1.75rem' }}>
          <h2 style={{
            textAlign: 'center', fontSize: '1.375rem', marginBottom: '1.75rem',
            fontFamily: 'var(--font-display)',
            background: 'linear-gradient(135deg, var(--color-text) 0%, var(--color-primary-light) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Iniciar Sesión
          </h2>

          {error && (
            <div className="alert-error" style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vendedor@estelar.com"
                required
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ marginTop: '0.5rem' }}
            >
              {loading
                ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                : <><LogIn size={18} /> Ingresar</>
              }
            </button>
          </form>
        </div>

        <p style={{
          textAlign: 'center', marginTop: '1.75rem', fontSize: '0.8125rem',
          color: 'var(--color-text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
        }}>
          <Tag size={13} />
          Solo para vendedores autorizados de Estelar
        </p>
      </div>
    </div>
  )
}
