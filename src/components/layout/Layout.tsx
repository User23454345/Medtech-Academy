import { useEffect, useState, type FormEvent } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { levelFor, useProgress, useToasts } from '../../lib/progress';
import { NAV } from './nav';

export function Layout() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const xp = useProgress((s) => s.xp);
  const streak = useProgress((s) => s.streak.current);
  const toasts = useToasts();
  const lvl = levelFor(xp);

  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (q.trim()) navigate(`/suche?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <div className="app">
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Hauptnavigation">
        <Link to="/" className="brand">
          <span className="brand-logo">✚</span>
          <span>
            MedTech Academy
            <small>Medizintechnik verstehen</small>
          </span>
        </Link>
        {NAV.map((g) => (
          <nav key={g.title} className="nav-group">
            <div className="nav-group-title">{g.title}</div>
            {g.items.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="ico">{it.icon}</span>
                {it.label}
              </NavLink>
            ))}
          </nav>
        ))}
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setOpen(true)} aria-label="Menü öffnen">
            ☰
          </button>
          <form className="topbar-search" onSubmit={submit} role="search">
            <span className="icon">🔍</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Geräte, Begriffe, Abkürzungen, Fehlerbilder suchen …" aria-label="Suche" />
          </form>
          <div className="topbar-stats">
            <Link to="/dashboard" className="stat-pill hide-sm" title="Lernserie">
              🔥 {streak}
            </Link>
            <Link to="/dashboard" className="stat-pill" title={lvl.title}>
              ⭐ Lv {lvl.level} · {xp} XP
            </Link>
          </div>
        </header>
        <main className="content" id="inhalt">
          <Outlet />
        </main>
        <footer className="footer">
          <strong>MedTech Academy</strong> – Lernplattform für Medizintechnik. Alle Inhalte dienen der Aus- und Weiterbildung.
          Simulationen sind vereinfachte Lernmodelle und ersetzen weder Herstellerunterlagen, Einweisungen nach MPBetreibV noch
          normgerechte Prüfungen durch qualifiziertes Personal. Plattform-Zertifikate sind keine staatlich anerkannten Abschlüsse.
          Lernfortschritt wird nur lokal in diesem Browser gespeichert. · <Link to="/ueber">Über die Plattform & Qualitätsprinzipien</Link>
        </footer>
      </div>
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span>{t.icon}</span>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
