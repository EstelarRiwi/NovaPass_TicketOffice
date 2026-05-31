import { useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Ticket } from 'lucide-react'

const CSS = `
@keyframes floaty { 0%,100%{ transform:rotate(-3.5deg) translateY(0);} 50%{ transform:rotate(-3.5deg) translateY(-9px);} }
@keyframes notfound-pulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.35;transform:scale(.6);} }
@keyframes notfound-scroll { from{transform:translateX(0);} to{transform:translateX(-50%);} }
.nf-ticket { animation: floaty 6s ease-in-out infinite; }
.nf-ticket::before, .nf-ticket::after {
  content:""; position:absolute; right:96px; width:18px; height:18px; border-radius:50%;
  background:#1c083a; transform:translateX(50%);
}
.nf-ticket::before { top:-9px; }
.nf-ticket::after  { bottom:-9px; }
.nf-dot { animation: notfound-pulse 1.4s infinite; }
.nf-marquee-track { animation: notfound-scroll 32s linear infinite; }
@media (max-width:560px) {
  .nf-ghost { -webkit-text-stroke-width: 1.5px !important; }
  .nf-btn { width:100%; }
  .nf-actions { width:100%; max-width:360px; }
}
@media (prefers-reduced-motion:reduce) {
  .nf-ticket, .nf-dot, .nf-marquee-track { animation:none !important; }
}
`

function buildQR(): React.ReactNode[] {
  const n = 21, size = 100, u = size / n
  let s = 7 * 9301 + 49297
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
  const isFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7)
  const rects: React.ReactNode[] = [
    <rect key="bg" width="100" height="100" fill="#fff" />,
  ]
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      let on = false
      if (isFinder(r, c)) {
        const lr = r < 7 ? r : r - (n - 7)
        const lc = c < 7 ? c : c - (n - 7)
        on = (lr === 0 || lr === 6 || lc === 0 || lc === 6) ||
             (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4)
      } else if (rnd() > 0.55) { on = true }
      if (on) rects.push(
        <rect key={`${r}-${c}`}
          x={+(c * u).toFixed(2)} y={+(r * u).toFixed(2)}
          width={+u.toFixed(2)} height={+u.toFixed(2)}
          rx={+(u * 0.18).toFixed(2)} fill="#4C1D95" />
      )
    }
  }
  return rects
}

const MARQUEE_NAMES = ['Karol G', 'Coldplay', 'Feid', 'Bad Bunny', 'Festival Estéreo', 'Sinfónica', 'Rock al Parque', 'DJ Live']

const StarSVG = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 21.4l1.4-6.8L2.2 9.9l6.9-.8z" />
  </svg>
)
const SmallStarSVG = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 21.4l1.4-6.8L2.2 9.9l6.9-.8z" />
  </svg>
)

export default function NotFound() {
  const navigate = useNavigate()
  const qrRects = useMemo(() => buildQR(), [])

  useEffect(() => {
    const el = document.createElement('style')
    el.id = 'nf-styles'
    el.textContent = CSS
    if (!document.getElementById('nf-styles')) document.head.appendChild(el)
    return () => { document.getElementById('nf-styles')?.remove() }
  }, [])

  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)'
  const fontDisplay = "'Space Grotesk', sans-serif"
  const fontBody = "'Plus Jakarta Sans', sans-serif"

  return (
    <div style={{ fontFamily: fontBody, color: '#fff', minHeight: '100vh', overflowX: 'hidden', position: 'relative', background: '#2b0d54' }}>
      {/* background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: "url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1400&q=80') center/cover no-repeat", transform: 'scale(1.06)', filter: 'saturate(115%)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'radial-gradient(120% 90% at 80% 0%, rgba(124,58,237,0.55) 0%, rgba(40,12,82,0.0) 45%), linear-gradient(180deg, rgba(40,12,82,0.78) 0%, rgba(40,12,82,0.62) 38%, rgba(28,8,58,0.96) 100%)' }} />
      <div style={{ position: 'fixed', width: 420, height: 420, borderRadius: '50%', zIndex: 1, filter: 'blur(90px)', pointerEvents: 'none', background: 'rgba(249,115,22,0.30)', top: -120, right: -60 }} />
      <div style={{ position: 'fixed', width: 460, height: 460, borderRadius: '50%', zIndex: 1, filter: 'blur(90px)', pointerEvents: 'none', background: 'rgba(167,139,250,0.28)', bottom: -160, left: -120 }} />

      {/* topbar logo */}
      <header style={{ position: 'relative', zIndex: 5, padding: '1.7rem clamp(1.25rem, 4vw, 3.5rem)' }}>
        <button onClick={() => navigate('/')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <span style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(140deg, #7C3AED 0%, #6D28D9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 6px 18px rgba(124,58,237,0.45)', flex: 'none', position: 'relative' }}>
            <StarSVG />
          </span>
          <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: '1.3rem', letterSpacing: '-0.02em', color: '#fff' }}>
            Nova<b style={{ color: '#F97316' }}>Pass</b>
          </span>
        </button>
      </header>

      {/* main content */}
      <main style={{ position: 'relative', zIndex: 5, minHeight: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1rem clamp(1.25rem, 4vw, 3.5rem) 2rem' }}>

        {/* eyebrow */}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem', fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#A78BFA', padding: '0.4rem 0.95rem', borderRadius: 999, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)', backdropFilter: 'blur(8px)', marginBottom: '1.6rem' }}>
          <span className="nf-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#F97316', display: 'inline-block' }} />
          Error 404
        </span>

        {/* ghost 404 */}
        <div className="nf-ghost" aria-hidden="true" style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 'clamp(7rem, 22vw, 16rem)', lineHeight: 0.82, letterSpacing: '-0.04em', color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,0.55)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(0.4rem, 1.5vw, 1rem)' }}>
          4
          <span style={{ color: '#F97316', WebkitTextStroke: '0', textShadow: '0 10px 30px rgba(249,115,22,0.45)' }}>0</span>
          4
        </div>

        <h1 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 'clamp(1.8rem, 4.5vw, 3rem)', lineHeight: 1.05, letterSpacing: '-0.02em', color: '#fff', marginBottom: '1rem' }}>
          Página no encontrada
        </h1>
        <p style={{ fontFamily: fontBody, fontSize: 'clamp(1rem, 1.6vw, 1.18rem)', color: 'rgba(255,255,255,0.84)', maxWidth: 540, lineHeight: 1.6, margin: '0 auto 2.2rem' }}>
          Parece que este evento ya no está en cartelera. La página que buscas se <b style={{ color: '#A78BFA', fontWeight: 700 }}>agotó</b>, cambió de escenario o nunca llegó a salir al show.
        </p>

        {/* ticket */}
        <div style={{ margin: '0 auto 2.4rem', perspective: 1000 }}>
          <div className="nf-ticket" style={{ display: 'flex', alignItems: 'stretch', width: 'min(440px, 86vw)', background: 'rgba(255,255,255,0.96)', color: '#4C1D95', borderRadius: 18, boxShadow: '0 30px 70px rgba(20,6,42,0.55)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ flex: 1, padding: '1.15rem 1.3rem', textAlign: 'left', minWidth: 0 }}>
              <div style={{ fontFamily: fontBody, fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#F97316' }}>NovaPass · Entrada digital</div>
              <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: '1.32rem', lineHeight: 1.05, margin: '0.35rem 0 0.7rem', color: '#4C1D95' }}>Página no encontrada</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem 0.8rem' }}>
                {[['Escenario','Desconocido',true],['Fila / Puerta','— / —',true],['Fecha','Nunca',false],['Estado','Inválida',true]].map(([lbl, val, err]) => (
                  <div key={String(lbl)}>
                    <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF' }}>{String(lbl)}</div>
                    <div style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: '0.92rem', color: err ? '#DC2626' : '#4C1D95', marginTop: 1 }}>{String(val)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ width: 104, flex: 'none', borderLeft: '2.5px dashed rgba(124,58,237,0.28)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', padding: '0.8rem 0.6rem', background: 'linear-gradient(180deg, #FAF5FF, #F3E8FF)' }}>
              <svg viewBox="0 0 100 100" aria-hidden="true" style={{ width: 64, height: 64, borderRadius: 6 }}>{qrRects}</svg>
              <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.12em', color: '#7C3AED' }}>ERR · 404</span>
            </div>
            {/* stamp */}
            <span style={{ position: 'absolute', top: '50%', left: '38%', transform: 'translate(-50%,-50%) rotate(-15deg)', border: '3px solid rgba(220,38,38,0.85)', color: 'rgba(220,38,38,0.85)', fontFamily: fontDisplay, fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.3rem 0.7rem', borderRadius: 8, pointerEvents: 'none', opacity: 0.92 }}>
              No válida
            </span>
          </div>
        </div>

        {/* action buttons */}
        <div className="nf-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.9rem', justifyContent: 'center' }}>
          <button className="nf-btn" onClick={() => navigate('/')} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.55rem', padding: '1rem 1.9rem', fontWeight: 700, fontFamily: fontBody, borderRadius: 999, fontSize: '1rem', letterSpacing: '-0.01em', whiteSpace: 'nowrap', transition: `transform .25s ${ease}, box-shadow .25s ${ease}`, border: 'none', cursor: 'pointer', background: '#F97316', color: '#fff', boxShadow: '0 10px 30px rgba(249,115,22,0.45)' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.background = '#EA580C' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.background = '#F97316' }}>
            <Home size={18} /> Volver al inicio
          </button>
          <button className="nf-btn" onClick={() => navigate('/')} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.55rem', padding: '1rem 1.9rem', fontWeight: 700, fontFamily: fontBody, borderRadius: 999, fontSize: '1rem', letterSpacing: '-0.01em', whiteSpace: 'nowrap', transition: `transform .25s ${ease}, background .2s`, border: '1.5px solid rgba(255,255,255,0.3)', cursor: 'pointer', background: 'rgba(255,255,255,0.12)', color: '#fff', backdropFilter: 'blur(10px)' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.22)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)' }}>
            <Ticket size={18} /> Explorar eventos
          </button>
        </div>
      </main>

      {/* marquee */}
      <div style={{ position: 'relative', zIndex: 5, overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.12)', padding: '0.9rem 0', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)', maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)' }}>
        <div className="nf-marquee-track" style={{ display: 'inline-flex', alignItems: 'center', gap: '2.4rem', whiteSpace: 'nowrap' }}>
          {[...MARQUEE_NAMES, ...MARQUEE_NAMES].map((name, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.7rem', fontFamily: fontDisplay, fontWeight: 600, fontSize: '0.95rem', color: 'rgba(255,255,255,0.55)' }}>
              {name} <span style={{ color: '#F97316' }}><SmallStarSVG /></span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
