const { useState, useEffect, useRef, useMemo } = React;

/* ── Easing helpers ── */
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const sub = (time, start, end) => clamp((time - start) / (end - start));

const ease = {
  outCubic: t => 1 - Math.pow(1 - t, 3),
  outExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  outBack: t => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
};

function fadeUp(time, start, end, dy = 24) {
  const p = ease.outCubic(sub(time, start, end || start + 0.5));
  return { opacity: p, transform: `translateY(${(1 - p) * dy}px)` };
}
function fadeIn(time, start, end) {
  return { opacity: ease.outCubic(sub(time, start, end || start + 0.4)) };
}
function slideIn(time, start, end, dx = -30) {
  const p = ease.outExpo(sub(time, start, end || start + 0.6));
  return { opacity: p, transform: `translateX(${(1 - p) * dx}px)` };
}
function scaleIn(time, start, end) {
  const p = ease.outBack(sub(time, start, end || start + 0.55));
  return { opacity: Math.min(p * 1.5, 1), transform: `scale(${0.82 + 0.18 * p})` };
}
function clipReveal(time, start, end) {
  const p = ease.outExpo(sub(time, start, end || start + 0.7));
  return { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`, opacity: p > 0.01 ? 1 : 0 };
}

/* ── Timer hook (IntersectionObserver) ── */
function useAnimTimer(ref, duration, threshold = 0.25) {
  const [time, setTime] = useState(0);
  const [active, setActive] = useState(false);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      entries => {
        const e = entries[0];
        setActive(e.isIntersecting && e.intersectionRatio >= threshold);
      },
      { threshold: [0, threshold, 0.6, 1] }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ref, threshold]);

  useEffect(() => {
    if (!active) {
      setTime(0);
      startRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    startRef.current = null;
    const step = ts => {
      if (startRef.current == null) startRef.current = ts;
      const t = (ts - startRef.current) / 1000;
      if (t >= duration) { setTime(duration); return; }
      setTime(t);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active, duration]);

  return { time, active, progress: clamp(time / duration) };
}

/* ── AnimatedSection ── */
function AnimatedSection({ id, className, duration, children, style }) {
  const ref = useRef(null);
  const timer = useAnimTimer(ref, duration);
  return (
    <section ref={ref} id={id} className={`section ${className || ''}`} style={style}>
      <div className="section-progress">
        <div className="section-progress-fill" style={{ width: (timer.progress * 100) + '%' }} />
      </div>
      {typeof children === 'function' ? children(timer) : children}
    </section>
  );
}

/* ── Bubbles ── */
function Bubbles({ count = 18, active }) {
  const items = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 2 + Math.random() * 5,
      delay: Math.random() * 4,
      dur: 4 + Math.random() * 5,
      drift: (Math.random() - 0.5) * 40,
    })), [count]);

  return (
    <div className="bubbles-wrap">
      {items.map(b => (
        <span key={b.id} className="bubble" style={{
          left: b.x + '%',
          width: b.size, height: b.size,
          animationDuration: b.dur + 's',
          animationDelay: b.delay + 's',
          '--drift': b.drift + 'px',
          animationPlayState: active ? 'running' : 'paused',
          opacity: active ? undefined : 0,
        }} />
      ))}
    </div>
  );
}

/* ── Wave SVG ── */
function WaveDivider({ fill, flip, className }) {
  return (
    <div className={`wave-div ${flip ? 'wave-div--top' : ''} ${className || ''}`}>
      <svg viewBox="0 0 1440 100" preserveAspectRatio="none">
        <path d="M0,60 C240,100 480,20 720,55 C960,90 1200,25 1440,50 L1440,100 L0,100Z" fill={fill} opacity="0.5" />
        <path d="M0,70 C300,30 600,85 900,50 C1100,25 1300,70 1440,40 L1440,100 L0,100Z" fill={fill} />
      </svg>
    </div>
  );
}

/* ── Nav Dots ── */
function NavDots() {
  const ids = ['hero', 'benefits', 'social', 'cta'];
  const labels = ['Início', 'Aprender', 'Prova', 'Baixar'];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const secs = ids.map(id => document.getElementById(id)).filter(Boolean);
      let best = 0, bestDist = Infinity;
      secs.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        const dist = Math.abs(r.top + r.height / 2 - window.innerHeight / 2);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      setActive(best);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className="nav-dots" aria-label="Navegação">
      {ids.map((id, i) => (
        <button key={id}
          className={`nav-dot ${i === active ? 'active' : ''}`}
          onClick={() => {
            const el = document.getElementById(id);
            if (el) window.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
          }}
          aria-label={labels[i]}
        >
          <span className="nav-dot-label">{labels[i]}</span>
        </button>
      ))}
    </nav>
  );
}

/* ══ HERO ══ */
function HeroScene({ time, active }) {
  const imgScale = 1.12 - 0.12 * ease.outExpo(sub(time, 0, 2.5));
  const imgOpacity = ease.outCubic(sub(time, 0, 1.2));

  return (
    <>
      <Bubbles count={16} active={active} />

      <div className="hero-layout">
        <div className="hero-content">
          <div className="hero-eyebrow" style={fadeUp(time, 0.3, 0.8)}>
            <span className="eyebrow-dot" />
            Ebook grátis · Surf para iniciantes
          </div>

          <h1 className="hero-title">
            <span className="title-line">
              <span style={fadeUp(time, 0.6, 1.2, 56)}>Ainda não fica</span>
            </span>
            <span className="title-line">
              <span style={fadeUp(time, 0.9, 1.5, 56)}>em pé na <em>prancha?</em></span>
            </span>
          </h1>

          <p className="hero-sub" style={fadeUp(time, 1.4, 2.0)}>
            Descubra os 7 erros que fazem iniciantes caírem sempre no mesmo ponto — e como eliminar cada um sem precisar de talento especial.
          </p>

          <p className="hero-support" style={fadeUp(time, 1.7, 2.3)}>
            Você aparece. Tenta. Cai no mesmo lugar. Tenta de novo. Cai igual.
            Isso não é falta de jeito. São 7 erros técnicos específicos.
          </p>

          <div className="form-card" style={fadeUp(time, 2.1, 2.8)}>
            <input type="text" placeholder="Primeiro nome (opcional)" autoComplete="given-name" />
            <input type="email" placeholder="Seu melhor email" autoComplete="email" required />
            <button className="cta-btn" onClick={e => window.submitLead(e.currentTarget)}>
              <span>Quero meu ebook grátis</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <p className="form-proof">Sem spam. Cancele a qualquer hora.</p>
          </div>
        </div>

        <div className="hero-img-col" style={{ opacity: imgOpacity }}>
          <img
            src="https://d8j0ntlcm91z4.cloudfront.net/user_3AfgSQ1pBB8qDlclTCouojEjQWJ/hf_20260511_191544_15f7a115-9087-4654-bbc2-8e64f2aa899b_min.webp"
            alt="Thiago surfando" draggable="false"
            style={{ transform: `scale(${imgScale})` }}
          />
        </div>
      </div>

      <WaveDivider fill="var(--white)" />

      {time > 3.5 && (
        <div className="scroll-hint" style={fadeIn(time, 3.5, 4.3)}>
          <span>role para baixo</span>
          <div className="scroll-arrow" />
        </div>
      )}
    </>
  );
}

/* ══ BENEFITS ══ */
function BenefitsScene({ time }) {
  const bullets = [
    ['01', 'Por que você perde o equilíbrio na hora de levantar', ' — e o ajuste de peso que muda tudo no próximo treino'],
    ['02', 'O erro de joelhos que 9 em 10 iniciantes cometem', ' — e que faz você cair sempre do mesmo lado'],
    ['03', 'Como usar os braços pra não cair', ' — a maioria ignora isso, e é mais fácil de corrigir do que parece'],
    ['04', 'Por que você pega a onda mas não controla pra onde vai', ' — tem a ver com onde você olha, não com força'],
    ['05', 'O posicionamento certo na prancha', ' — muito à frente ou muito atrás arruína tudo antes de você levantar'],
    ['06', 'Por que a remada inconsistente faz você perder onda tras onda', ' — e a técnica simples que resolve isso'],
    ['07', 'Quando você está pronto pra tentar virar', ' — e por que tentar antes disso é a raiz de muita frustração'],
  ];

  return (
    <div className="benefits-inner">
      <div className="stag" style={clipReveal(time, 0.1, 0.7)}>O que você vai aprender</div>
      <h2 className="stitle" style={fadeUp(time, 0.3, 0.9, 28)}>
        Em 8 páginas você vai <br />entender exatamente:
      </h2>
      <p className="slead" style={fadeUp(time, 0.6, 1.1)}>
        Tudo em linguagem direta. Sem enrolação. 10 minutos de leitura.
      </p>

      <div className="bullet-list">
        {bullets.map(([num, title, desc], i) => {
          const start = 1.0 + i * 0.3;
          return (
            <div key={i} className="bullet-item" style={slideIn(time, start, start + 0.55, -28)}>
              <span className="bullet-num">{num}</span>
              <span className="bullet-text"><strong>{title}</strong>{desc}</span>
            </div>
          );
        })}
      </div>

      <p className="benefits-foot" style={fadeUp(time, 3.8, 4.3)}>
        PDF gratuito. Sem cadastro de cartão. Acesso imediato.
      </p>
    </div>
  );
}

/* ══ SOCIAL PROOF ══ */
function SocialScene({ time }) {
  return (
    <div className="social-inner">
      <div className="stag" style={clipReveal(time, 0.1, 0.5)}>O que dizem</div>
      <h2 className="stitle" style={fadeUp(time, 0.3, 0.8, 28)}>
        Quem já eliminou esses erros
      </h2>

      <div className="testi-grid">
        <div className="testi-card" style={scaleIn(time, 0.7, 1.3)}>
          <div className="testi-quote">"</div>
          <blockquote>Eu ficava caindo sempre no lado direito e achei que era jeito. Era o joelho. Corrigi em uma aula.</blockquote>
          <cite>[Nome], [cidade]</cite>
          <span className="smoke-label">substituir por depoimento real</span>
        </div>
        <div className="testi-card" style={scaleIn(time, 1.0, 1.6)}>
          <div className="testi-quote">"</div>
          <blockquote>Tentei por meses sozinho. Li o ebook, entendi onde estava errando. Na aula seguinte fiquei em pé.</blockquote>
          <cite>[Nome], [cidade]</cite>
          <span className="smoke-label">substituir por depoimento real</span>
        </div>
      </div>
    </div>
  );
}

/* ══ CTA ══ */
function CTAScene({ time, active }) {
  return (
    <>
      <Bubbles count={10} active={active} />
      <div className="cta-inner">
        <h2 className="cta-title" style={fadeUp(time, 0.1, 0.7, 34)}>
          Pronto pra eliminar<br />esses erros?
        </h2>
        <p className="cta-subtitle" style={fadeUp(time, 0.4, 1.0)}>
          Receba o PDF grátis agora. Leia antes do próximo treino.
        </p>
        <div className="form-card cta-form-card" style={fadeUp(time, 0.8, 1.5)}>
          <input type="text" placeholder="Primeiro nome (opcional)" autoComplete="given-name" />
          <input type="email" placeholder="Seu melhor email" autoComplete="email" required />
          <button className="cta-btn" onClick={e => window.submitLead(e.currentTarget)}>
            <span>Quero meu ebook grátis</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          <p className="form-proof">Sem spam. Cancele a qualquer hora.</p>
        </div>
      </div>
    </>
  );
}

/* ══ LEGAL ══ */
function LegalScene({ time }) {
  return (
    <div className="legal-inner">
      <p className="legal-text" style={fadeIn(time, 0.1, 0.6)}>
        Ao enviar seu email você concorda em receber conteúdos de Thiago Freitas sobre surf e técnica de surf. Você pode cancelar a qualquer momento pelo link de descadastro. Seus dados não serão compartilhados. <a href="#">Política de privacidade</a>.
      </p>
      <div className="legal-bar" style={fadeIn(time, 0.4, 0.8)} />
      <p className="legal-brand" style={fadeIn(time, 0.6, 1.0)}>Thiago Surf Coach © 2026</p>
    </div>
  );
}

/* ══ APP ══ */
function SurfApp() {
  return (
    <>
      <AnimatedSection id="hero" className="hero" duration={5}>
        {t => <HeroScene {...t} />}
      </AnimatedSection>

      <AnimatedSection id="benefits" className="benefits" duration={5}>
        {t => <BenefitsScene {...t} />}
      </AnimatedSection>

      <AnimatedSection id="social" className="social-proof" duration={3.5}>
        {t => <SocialScene {...t} />}
      </AnimatedSection>

      <AnimatedSection id="cta" className="cta-section" duration={4}>
        {t => <CTAScene {...t} />}
      </AnimatedSection>

      <AnimatedSection id="legal" className="legal" duration={2} style={{ minHeight: 'auto' }}>
        {t => <LegalScene {...t} />}
      </AnimatedSection>

      <NavDots />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<SurfApp />);
