import { useEffect, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AreaId, Module } from '../types/content';
import {
  cases,
  deviceById,
  devices,
  faults,
  fieldById,
  fields,
  lessonIndex,
  moduleById,
  modulesByArea,
  simMetas,
} from '../data/registry';
import { completeLesson, useProgress } from '../lib/progress';
import { Blocks, DeviceMiniCard } from '../components/ui/Blocks';
import { DifficultyBadge, Empty, LevelSwitch, PageHead, ProgressBar, SourceList } from '../components/ui/Common';
import { Rich } from '../lib/text';
import { formatDate } from '../lib/util';
import { NotFound } from './Misc';

interface AreaConfig {
  title: string;
  kicker: string;
  lead: string;
  extras?: () => ReactNode;
}

function SimCards({ group, ids }: { group?: string; ids?: string[] }) {
  const list = simMetas.filter((s) => (group ? s.group === group : true) && (ids ? ids.includes(s.id) : true));
  if (list.length === 0) return null;
  return (
    <div className="grid grid-3">
      {list.map((s) => (
        <Link key={s.id} to={`/labor/${s.id}`} className="card hover">
          <div className="ico-lg">{s.icon}</div>
          <div className="card-title mt-1">{s.title}</div>
          <p className="card-sub">{s.description}</p>
          {s.status === 'prototyp' && <span className="badge warn mt-1">Prototyp</span>}
        </Link>
      ))}
    </div>
  );
}

const AREAS: Record<AreaId, AreaConfig> = {
  medizintechnik: {
    kicker: 'Einstieg',
    title: 'Was ist Medizintechnik?',
    lead: 'Bevor es um einzelne Geräte geht: Was Medizintechnik ist, wie sie entstanden ist, welche Fachbereiche es gibt und wer in diesem Feld arbeitet.',
    extras: () => (
      <section className="section">
        <div className="section-head">
          <h2>Die 12 Fachbereiche der Medizintechnik</h2>
          <span className="muted small">Jeder Fachbereich mit Erklärung, typischen Geräten und Wissenstest</span>
        </div>
        <div className="grid grid-4">
          {fields.map((f) => (
            <Link key={f.id} to={`/fachbereiche/${f.id}`} className="card hover">
              <div className="ico-lg">{f.icon}</div>
              <div className="card-title mt-1">{f.name}</div>
              <p className="card-sub">{f.short}</p>
              <span className="badge navy mt-1">{devices.filter((d) => d.fields.includes(f.id)).length} Geräte</span>
            </Link>
          ))}
        </div>
      </section>
    ),
  },
  geraetemodul: {
    kicker: 'Vollständige Lernmodule',
    title: 'Gerätemodule',
    lead: 'Ausgewählte Schlüsselgeräte – vollständig, wissenschaftlich fundiert und interaktiv erklärt: vom physikalischen Prinzip über den Aufbau bis zu Alarmen, Prüfung und typischen Fehlern.',
  },
  grundlagen: {
    kicker: 'Technische & medizinische Grundlagen',
    title: 'Medizintechnik-Grundlagen',
    lead: 'Elektrotechnik, Elektronik, Physik, Messtechnik und Medizin – das Fundament, um Medizingeräte wirklich zu verstehen. Jedes Kapitel zeigt, wo das Wissen in realen Geräten gebraucht wird.',
    extras: () => (
      <section className="section">
        <div className="section-head"><h2>Physik interaktiv</h2></div>
        <SimCards group="physik" />
      </section>
    ),
  },
  elektronik: {
    kicker: 'Elektronik- & Schaltungslabor',
    title: 'Elektronik & Schaltungen',
    lead: 'Von Ohm bis Operationsverstärker: Bauteile, Schaltungen, Signalverarbeitung und Schaltpläne verstehen – mit einem virtuellen Schaltungslabor, das Messwerte sofort berechnet.',
    extras: () => (
      <section className="section">
        <div className="section-head"><h2>Virtuelles Schaltungslabor</h2></div>
        <SimCards group="elektronik" />
      </section>
    ),
  },
  instandhaltung: {
    kicker: 'Wartung · Fehlerdiagnose · Reparatur',
    title: 'Instandhaltung von Medizingeräten',
    lead: 'Wie Medizingeräte professionell instand gehalten werden: Begriffe nach DIN 31051, systematische Fehlersuche, Reparaturgrundlagen und Dokumentation – mit interaktiven Diagnosebäumen.',
    extras: () => (
      <>
        <section className="section">
          <div className="section-head">
            <h2>Typische Fehlerbilder – interaktive Diagnosebäume</h2>
            <Link to="/service-labor" className="btn secondary sm">Zum virtuellen Service-Labor →</Link>
          </div>
          {faults.length === 0 ? (
            <Empty>Noch keine Fehlerbilder vorhanden.</Empty>
          ) : (
            <div className="grid grid-3">
              {faults.map((f) => (
                <Link key={f.id} to={`/instandhaltung/fehler/${f.id}`} className="card hover">
                  <div className="row between">
                    <span className="ico-lg">🩺</span>
                    <DifficultyBadge d={f.difficulty} />
                  </div>
                  <div className="card-title mt-1">{f.title}</div>
                  <p className="card-sub"><Rich text={f.description.slice(0, 140) + (f.description.length > 140 ? ' …' : '')} /></p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </>
    ),
  },
  pruefung: {
    kicker: 'STK · MTK · Prüfverfahren',
    title: 'STK, MTK und Prüfverfahren',
    lead: 'Rechtliche Grundlagen (MDR, MPDG, MPBetreibV), Normen (IEC 60601, DIN EN 62353), sicherheits- und messtechnische Kontrollen sowie ein virtuelles Prüflabor.',
    extras: () => (
      <section className="section">
        <div className="section-head"><h2>Virtuelles Prüf- & Messtechniklabor</h2></div>
        <div className="callout vereinfachung">
          <div className="callout-title">📐 Lernumgebung</div>
          Die Prüfsimulationen sind Lernumgebungen und kein Ersatz für eine reale, normgerechte Prüfung mit geeigneten,
          kalibrierten Prüfmitteln durch qualifiziertes Personal.
        </div>
        <SimCards group="pruefung" />
        <div className="mt-2" />
        <SimCards group="messtechnik" />
      </section>
    ),
  },
  sicherheit: {
    kicker: 'Medizinprodukte-Sicherheit',
    title: 'Sicherheit & Risikomanagement',
    lead: 'Was ein Medizinprodukt ist, Risikoklassen, CE-Kennzeichnung, Betreiberpflichten, elektrische und Cybersicherheit, Vorkommnismeldungen und Risikomanagement nach ISO 14971.',
  },
  dokumentation: {
    kicker: 'Technische Dokumentation',
    title: 'Technische Dokumentation',
    lead: 'Bedienungsanleitungen, Servicehandbücher, Schaltpläne und Prüfprotokolle lesen und einordnen.',
  },
};

export function moduleProgress(m: Module, completed: Record<string, number>) {
  const done = m.lessons.filter((l) => completed[l.id]).length;
  return { done, total: m.lessons.length, ratio: m.lessons.length ? done / m.lessons.length : 0 };
}

export function ModuleCard({ m }: { m: Module }) {
  const completed = useProgress((s) => s.completedLessons);
  const p = moduleProgress(m, completed);
  const minutes = m.lessons.reduce((a, l) => a + l.minutes, 0);
  return (
    <Link to={`/modul/${m.id}`} className="card hover">
      <div className="row between">
        <span className="ico-lg">{m.icon}</span>
        <span className="row" style={{ gap: 6 }}>
          {m.status === 'prototyp' && <span className="badge warn">Prototyp</span>}
          <span className="badge navy">{m.lessons.length} Lektionen · {minutes} min</span>
        </span>
      </div>
      <div className="card-title mt-1">{m.title}</div>
      <p className="card-sub">{m.description}</p>
      <div className="mt-1">
        <ProgressBar value={p.ratio} />
        <span className="tiny muted">{p.done}/{p.total} abgeschlossen</span>
      </div>
    </Link>
  );
}

export function AreaPage({ area }: { area: AreaId }) {
  const cfg = AREAS[area];
  const mods = modulesByArea(area);
  return (
    <div>
      <PageHead kicker={cfg.kicker} title={cfg.title} lead={cfg.lead} />
      {mods.length === 0 ? (
        <Empty>Für diesen Bereich sind noch keine Module angelegt.</Empty>
      ) : (
        <div className="grid grid-3">
          {mods.map((m) => <ModuleCard key={m.id} m={m} />)}
        </div>
      )}
      {cfg.extras?.()}
      {area === 'instandhaltung' && cases.some((c) => c.usage !== 'fall') && (
        <p className="mt-2 small muted">Tipp: Im Service-Labor löst du simulierte Gerätestörungen Schritt für Schritt.</p>
      )}
    </div>
  );
}

export function ModulePage() {
  const { id } = useParams();
  const m = id ? moduleById.get(id) : undefined;
  const completed = useProgress((s) => s.completedLessons);
  if (!m) return <NotFound />;
  const p = moduleProgress(m, completed);
  const areaHref = areaPath(m.area);
  const next = m.lessons.find((l) => !completed[l.id]) ?? m.lessons[0];
  const allSources = Array.from(new Set(m.lessons.flatMap((l) => l.sources)));
  const linked = Array.from(new Set(m.lessons.flatMap((l) => l.devices ?? [])))
    .map((d) => deviceById.get(d))
    .filter(Boolean);
  return (
    <div>
      <PageHead kicker={AREAS[m.area].title} title={`${m.icon} ${m.title}`} lead={m.description} crumbs={[[AREAS[m.area].title, areaHref], [m.title]]}>
        <div className="row mt-1">
          {m.status === 'prototyp' && <span className="badge warn">Prototyp – Inhalte werden erweitert</span>}
          <span className="badge navy">{m.lessons.length} Lektionen</span>
          <span className="badge">{m.lessons.reduce((a, l) => a + l.minutes, 0)} Minuten</span>
          {next && <Link to={`/lektion/${next.id}`} className="btn">{p.done === 0 ? 'Modul starten' : p.done === p.total ? 'Nochmal ansehen' : 'Weiterlernen'} →</Link>}
        </div>
        <div className="mt-2" style={{ maxWidth: 420 }}>
          <ProgressBar value={p.ratio} />
          <span className="tiny muted">{p.done}/{p.total} Lektionen abgeschlossen</span>
        </div>
      </PageHead>
      <ol className="stack" style={{ listStyle: 'none', padding: 0 }}>
        {m.lessons.map((l, i) => (
          <li key={l.id}>
            <Link to={`/lektion/${l.id}`} className="card hover row" style={{ flexWrap: 'nowrap', gap: 16 }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', fontWeight: 800, background: completed[l.id] ? 'var(--ok-bg)' : 'var(--surface-2)', color: completed[l.id] ? 'var(--ok)' : 'var(--navy-700)', flex: '0 0 34px' }}>
                {completed[l.id] ? '✓' : i + 1}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="card-title" style={{ display: 'block' }}>{l.title}</span>
                <span className="card-sub" style={{ display: 'block' }}>{l.summary}</span>
              </span>
              <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                <DifficultyBadge d={l.difficulty} />
                <span className="badge">{l.minutes} min</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      {linked.length > 0 && (
        <section className="section">
          <h2>Geräte in diesem Modul</h2>
          <div className="grid grid-3" style={{ gap: 10 }}>
            {linked.map((d) => <DeviceMiniCard key={d!.id} d={d!} />)}
          </div>
        </section>
      )}
      <SourceList ids={allSources} title="Quellen des Moduls" />
    </div>
  );
}

export function areaPath(a: AreaId): string {
  return (
    {
      medizintechnik: '/medizintechnik',
      geraetemodul: '/geraetemodule',
      grundlagen: '/grundlagen',
      elektronik: '/elektronik',
      instandhaltung: '/instandhaltung',
      pruefung: '/pruefung',
      sicherheit: '/sicherheit',
      dokumentation: '/dokumentation',
    } as const
  )[a];
}

export function LessonPage() {
  const { id } = useParams();
  const entry = id ? lessonIndex.get(id) : undefined;
  const done = useProgress((s) => (id ? !!s.completedLessons[id] : false));
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id]);
  if (!entry) return <NotFound />;
  const { lesson: l, module: m } = entry;
  const idx = m.lessons.findIndex((x) => x.id === l.id);
  const prev = m.lessons[idx - 1];
  const next = m.lessons[idx + 1];
  const hasLeveled = l.blocks.some((b) => b.type === 'leveled');
  return (
    <div className="split">
      <article style={{ minWidth: 0 }}>
        <PageHead kicker={`${m.title} · Lektion ${idx + 1}/${m.lessons.length}`} title={l.title} lead={l.summary} crumbs={[[AREAS[m.area].title, areaPath(m.area)], [m.title, `/modul/${m.id}`], [l.title]]}>
          <div className="row">
            <DifficultyBadge d={l.difficulty} />
            <span className="badge">⏱ {l.minutes} min</span>
            <span className="stand">🗓️ Stand {formatDate(l.updated)}</span>
            {hasLeveled && <LevelSwitch />}
          </div>
        </PageHead>
        <Blocks blocks={l.blocks} ctx={l.id} />
        <div className="card mt-3 row between" style={{ background: done ? 'var(--ok-bg)' : '#fff' }}>
          <div>
            <strong>{done ? '✓ Lektion abgeschlossen' : 'Fertig mit dieser Lektion?'}</strong>
            <div className="small muted">{done ? 'Gut gemacht! Weiter geht’s mit der nächsten Lektion.' : 'Markiere sie als abgeschlossen, um Fortschritt und XP zu sammeln.'}</div>
          </div>
          {!done && <button className="btn" onClick={() => completeLesson(l.id, l.title)}>Abschließen (+20 XP)</button>}
        </div>
        <div className="row between mt-2">
          {prev ? <Link className="btn secondary" to={`/lektion/${prev.id}`}>← {prev.title}</Link> : <span />}
          {next ? <Link className="btn navy" to={`/lektion/${next.id}`}>{next.title} →</Link> : <Link className="btn navy" to={`/modul/${m.id}`}>Zur Modulübersicht</Link>}
        </div>
        <SourceList ids={l.sources} updated={l.updated} />
      </article>
      <aside className="sticky no-print">
        <div className="card">
          <div className="card-title">{m.icon} {m.title}</div>
          <ol className="small" style={{ paddingLeft: 18, margin: '8px 0 0' }}>
            {m.lessons.map((x) => (
              <li key={x.id} style={{ marginBottom: 4 }}>
                {x.id === l.id ? <strong>{x.title}</strong> : <Link to={`/lektion/${x.id}`}>{x.title}</Link>}
              </li>
            ))}
          </ol>
        </div>
        {l.devices && l.devices.length > 0 && (
          <div className="card mt-2">
            <div className="card-title">Praxisbezug: Geräte</div>
            <div className="stack mt-1" style={{ gap: 6 }}>
              {l.devices.map((d) => deviceById.get(d)).filter(Boolean).map((d) => (
                <Link key={d!.id} to={`/geraete/${d!.id}`} className="small">→ {d!.name}</Link>
              ))}
            </div>
          </div>
        )}
        <div className="card mt-2">
          <div className="card-title">🤖 Fragen dazu?</div>
          <p className="small mb-0">Der <Link to={`/coach?q=${encodeURIComponent(l.title)}`}>KI-Lerncoach</Link> erklärt Begriffe auf drei Ebenen.</p>
        </div>
      </aside>
    </div>
  );
}

export function FieldPage() {
  const { id } = useParams();
  const f = id ? fieldById.get(id as never) : undefined;
  if (!f) return <NotFound />;
  const devs = devices.filter((d) => d.fields.includes(f.id));
  // Lektion zum Fachbereich (Konvention: ID "fachbereich-<field-id>")
  const lesson = lessonIndex.get(`fachbereich-${f.id}`);
  return (
    <div>
      <PageHead kicker="Fachbereich der Medizintechnik" title={`${f.icon} ${f.name}`} lead={f.short} crumbs={[['Was ist Medizintechnik?', '/medizintechnik'], [f.name]]} />
      {lesson ? (
        <>
          <Blocks blocks={lesson.lesson.blocks} ctx={lesson.lesson.id} />
          <SourceList ids={lesson.lesson.sources} updated={lesson.lesson.updated} />
        </>
      ) : (
        <Empty>Die ausführliche Lektion zu diesem Fachbereich ist in Vorbereitung.</Empty>
      )}
      <section className="section">
        <h2>Geräte in diesem Fachbereich ({devs.length})</h2>
        <div className="grid grid-3" style={{ gap: 10 }}>
          {devs.map((d) => <DeviceMiniCard key={d.id} d={d} />)}
        </div>
      </section>
    </div>
  );
}
