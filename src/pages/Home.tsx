import { Link } from 'react-router-dom';
import { cases, categories, devices, glossary, modules, simMetas, faults, learningPaths } from '../data/registry';
import { levelFor, useProgress } from '../lib/progress';
import { dailyTasks, deviceOfTheDay, recommendations } from '../lib/tasks';
import { Rich } from '../lib/text';
import { ProgressBar } from '../components/ui/Common';
import { ModuleCard } from './Areas';

const AREAS = [
  { to: '/medizintechnik', icon: '🌍', title: 'Was ist Medizintechnik?', text: 'Fachbereiche, Geschichte, Berufe und die Rolle der Technik im Klinikalltag.' },
  { to: '/geraete', icon: '🗂️', title: 'Geräte-Katalog', text: 'Über 100 Medizingeräte systematisch erklärt – durchsuchbar und filterbar.' },
  { to: '/labor', icon: '🧪', title: 'Technik-Labor', text: 'Simulationen: Beatmung, EKG, Defibrillation, Infusion, Ultraschall, Röntgen, Dialyse.' },
  { to: '/grundlagen', icon: '⚡', title: 'Technische Grundlagen', text: 'Elektrotechnik, Elektronik, Physik, Messtechnik und Medizin für die Medizintechnik.' },
  { to: '/instandhaltung', icon: '🛠️', title: 'Instandhaltung & Reparatur', text: 'Wartung, Fehlerdiagnose mit Diagnosebäumen und ein virtuelles Service-Labor.' },
  { to: '/pruefung', icon: '✅', title: 'STK, MTK & Prüfung', text: 'Recht, Normen und ein virtuelles Prüflabor mit Sicherheitsanalysator.' },
  { to: '/krankenhaus', icon: '🏥', title: 'Virtuelles Krankenhaus', text: 'Intensivstation, OP, Notaufnahme & Co. – Geräte im Zusammenspiel erleben.' },
  { to: '/akademie', icon: '🎓', title: 'Prüfungsakademie', text: 'Prüfungsvorbereitung mit Auswertung, Wissenslücken und Zertifikaten.' },
];

function EcgLine() {
  return (
    <svg className="hero-ecg" viewBox="0 0 520 120" fill="none" aria-hidden>
      <path d="M0 70 H120 l10 -6 l10 6 H170 l6 8 l10 -62 l10 76 l8 -22 H260 l14 -10 l14 10 H360 l6 8 l10 -62 l10 76 l8 -22 H460 l14 -10 l14 10 H520" stroke="#5eead4" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Home() {
  const s = useProgress((x) => x);
  const lvl = levelFor(s.xp);
  const lessons = modules.reduce((a, m) => a + m.lessons.length, 0);
  const tasks = dailyTasks();
  const recs = recommendations(s);
  const dev = deviceOfTheDay();
  const featured = modules.filter((m) => m.area === 'geraetemodul').slice(0, 5);
  const isNew = s.xp === 0;
  return (
    <div>
      <section className="hero">
        <EcgLine />
        <div className="kicker" style={{ color: 'var(--teal-400)' }}>Digitale Medizintechnik-Akademie</div>
        <h1>Medizintechnik entdecken, verstehen, simulieren und lernen.</h1>
        <p>Wissenschaftlich fundiert und spielerisch vermittelt – von den physikalischen Grundlagen über die Funktion von Beatmungsgerät, Monitor und Defibrillator bis zu Instandhaltung, STK und MTK.</p>
        <div className="row mt-2">
          {isNew ? <Link to="/lernpfade" className="btn">Lernpfad wählen →</Link> : <Link to="/dashboard" className="btn">Weiterlernen →</Link>}
          <Link to="/geraete" className="btn secondary">Geräte-Katalog öffnen</Link>
          <Link to="/coach" className="btn secondary">🤖 Coach fragen</Link>
        </div>
      </section>

      <section className="section grid grid-4">
        <div className="card kpi"><span className="v">{devices.length}</span><span className="l">Geräteprofile in {categories.length} Kategorien</span></div>
        <div className="card kpi"><span className="v">{lessons}</span><span className="l">Lektionen in {modules.length} Modulen</span></div>
        <div className="card kpi"><span className="v">{simMetas.length}</span><span className="l">interaktive Simulationen</span></div>
        <div className="card kpi"><span className="v">{cases.length + faults.length}</span><span className="l">Fälle & Diagnosebäume · {glossary.length} Lexikonbegriffe</span></div>
      </section>

      <section className="section grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 330px), 1fr))' }}>
        <div className="card">
          <div className="row between">
            <div>
              <div className="kicker">Dein Stand</div>
              <div className="card-title">Level {lvl.level} · {lvl.title}</div>
            </div>
            <span className="badge teal">🔥 {s.streak.current} Tage</span>
          </div>
          <div className="mt-1"><ProgressBar value={lvl.progress} /></div>
          <p className="tiny muted mt-1">{s.xp} XP{lvl.next ? ` · noch ${lvl.next.xp - s.xp} XP bis Level ${lvl.next.level}` : ' · Höchststufe erreicht'}</p>
          <div className="kicker mt-2">Heute für dich</div>
          <div className="stack" style={{ gap: 6 }}>
            {tasks.map((t) => {
              const [a, b] = t.progress(s);
              return (
                <Link key={t.id} to={t.href} className="row between small" style={{ flexWrap: 'nowrap' }}>
                  <span>{a >= b ? '✅' : '⬜'} {t.title}</span>
                  <span className="badge">+{t.xp} XP</span>
                </Link>
              );
            })}
          </div>
        </div>
        <div className="card">
          <div className="kicker">Empfohlen als Nächstes</div>
          <div className="stack mt-1" style={{ gap: 8 }}>
            {recs.length === 0 && <span className="small muted">Starte mit einem Lernpfad – dann bekommst du hier Empfehlungen.</span>}
            {recs.map((r, i) => (
              <Link key={i} to={r.href} className="row" style={{ flexWrap: 'nowrap', gap: 10 }}>
                <span className="ico-lg" style={{ fontSize: '1.3rem' }}>{r.icon}</span>
                <span><span style={{ fontWeight: 600, display: 'block' }}>{r.title}</span><span className="tiny muted">{r.reason}</span></span>
              </Link>
            ))}
          </div>
        </div>
        {dev && (
          <Link to={`/geraete/${dev.id}`} className="card hover">
            <div className="kicker">Gerät des Tages</div>
            <div className="card-title">{dev.name}</div>
            <p className="card-sub"><Rich text={dev.short} /></p>
            <span className="btn sm mt-1">Entdecken (+10 XP)</span>
          </Link>
        )}
      </section>

      <section className="section">
        <div className="section-head"><h2>Die Bereiche der Akademie</h2></div>
        <div className="grid grid-4">
          {AREAS.map((a) => (
            <Link key={a.to} to={a.to} className="card hover">
              <div className="ico-lg">{a.icon}</div>
              <div className="card-title mt-1">{a.title}</div>
              <p className="card-sub">{a.text}</p>
            </Link>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>★ Vollständige Gerätemodule</h2><Link to="/geraetemodule">Alle ansehen →</Link></div>
          <div className="grid grid-3">{featured.map((m) => <ModuleCard key={m.id} m={m} />)}</div>
        </section>
      )}

      {learningPaths.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>🧭 Lernpfade nach Berufsziel</h2><Link to="/lernpfade">Alle Lernpfade →</Link></div>
          <div className="grid grid-3">
            {learningPaths.slice(0, 6).map((p) => (
              <Link key={p.id} to="/lernpfade" className="card hover">
                <div className="ico-lg">{p.icon}</div>
                <div className="card-title mt-1">{p.title}</div>
                <p className="card-sub">{p.audience}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
