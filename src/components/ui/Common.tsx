import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { CalloutVariant, ExplainLevel, LeveledText, Source } from '../../types/content';
import { sourceById } from '../../data/registry';
import { setExplainLevel, useProgress } from '../../lib/progress';
import { Rich, RichParagraphs } from '../../lib/text';
import { formatDate } from '../../lib/util';

export function PageHead({
  kicker,
  title,
  lead,
  crumbs,
  children,
}: {
  kicker?: string;
  title: string;
  lead?: string;
  crumbs?: [string, string?][];
  children?: ReactNode;
}) {
  return (
    <header className="page-head">
      {crumbs && (
        <nav className="breadcrumbs" aria-label="Brotkrumen">
          <Link to="/">Start</Link>
          {crumbs.map(([label, href], i) => (
            <span key={i}>
              {' / '}
              {href ? <Link to={href}>{label}</Link> : <span>{label}</span>}
            </span>
          ))}
        </nav>
      )}
      {kicker && <div className="kicker">{kicker}</div>}
      <h1>{title}</h1>
      {lead && (
        <p className="lead">
          <Rich text={lead} />
        </p>
      )}
      {children}
    </header>
  );
}

const CALLOUT_ICON: Record<CalloutVariant, string> = {
  info: 'ℹ️',
  merke: '💡',
  praxis: '🏥',
  warnung: '⚠️',
  sicherheit: '⛑️',
  vereinfachung: '📐',
};
const CALLOUT_TITLE: Record<CalloutVariant, string> = {
  info: 'Info',
  merke: 'Merke',
  praxis: 'Aus der Praxis',
  warnung: 'Achtung',
  sicherheit: 'Sicherheitshinweis',
  vereinfachung: 'Vereinfachtes Modell',
};

export function Callout({ variant, title, children }: { variant: CalloutVariant; title?: string; children: ReactNode }) {
  return (
    <div className={`callout ${variant}`}>
      <div className="callout-title">
        <span>{CALLOUT_ICON[variant]}</span>
        {title ?? CALLOUT_TITLE[variant]}
      </div>
      {children}
    </div>
  );
}

const LEVEL_LABEL: Record<ExplainLevel, string> = {
  einfach: 'Einfach erklärt',
  technisch: 'Technisch',
  experte: 'Expertenwissen',
};

export function LevelSwitch() {
  const level = useProgress((s) => s.explainLevel);
  return (
    <div className="segment" role="tablist" aria-label="Erklärungsebene">
      {(Object.keys(LEVEL_LABEL) as ExplainLevel[]).map((l) => (
        <button key={l} role="tab" aria-selected={level === l} className={level === l ? 'active' : ''} onClick={() => setExplainLevel(l)}>
          {LEVEL_LABEL[l]}
        </button>
      ))}
    </div>
  );
}

export function Leveled({ levels, title }: { levels: LeveledText; title?: string }) {
  const level = useProgress((s) => s.explainLevel);
  return (
    <div className="card" style={{ margin: '14px 0' }}>
      <div className="row between mb-2">
        <strong style={{ color: 'var(--navy-800)' }}>{title ?? 'Erklärung'}</strong>
        <LevelSwitch />
      </div>
      <div className="prose">
        <RichParagraphs text={levels[level]} />
      </div>
    </div>
  );
}

function formatSource(s: Source): ReactNode {
  return (
    <>
      {s.authors && <>{s.authors}: </>}
      <em>{s.title}</em>
      {s.edition && <>, {s.edition}</>}
      {s.publisher && <>. {s.publisher}</>}
      {s.year && <>, {s.year}</>}
      {s.url && (
        <>
          {' '}
          ·{' '}
          <a href={s.url} target="_blank" rel="noreferrer noopener">
            online
          </a>
        </>
      )}
      {s.accessed && <> (abgerufen {formatDate(s.accessed)})</>}
      {s.note && <span className="muted"> – {s.note}</span>}
    </>
  );
}

export function SourceList({ ids, updated, title = 'Quellen & weiterführende Literatur' }: { ids: string[]; updated?: string; title?: string }) {
  const unique = Array.from(new Set(ids));
  if (unique.length === 0 && !updated) return null;
  return (
    <section className="sources section" aria-label="Quellen">
      <div className="row between">
        <h3 className="mt-0">📚 {title}</h3>
        {updated && <span className="stand">🗓️ Inhaltsstand: {formatDate(updated)}</span>}
      </div>
      <ol>
        {unique.map((id) => {
          const s = sourceById.get(id);
          return <li key={id}>{s ? formatSource(s) : <span className="muted">Quelle „{id}“ (Eintrag fehlt in der Quellendatenbank)</span>}</li>;
        })}
      </ol>
      <p className="tiny muted">
        Didaktische Inhalte dieser Plattform vereinfachen bewusst. Für reale Arbeiten an Medizinprodukten sind stets die aktuellen
        Gesetze, Normen und die Herstellerdokumentation maßgeblich.
      </p>
    </section>
  );
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: [T, string][];
  active: T;
  onChange: (t: T) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(([id, label]) => (
        <button key={id} role="tab" aria-selected={active === id} className={`tab ${active === id ? 'active' : ''}`} onClick={() => onChange(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function DifficultyBadge({ d }: { d: 1 | 2 | 3 }) {
  const cls = d === 1 ? 'ok' : d === 2 ? 'warn' : 'bad';
  const label = d === 1 ? 'Einsteiger' : d === 2 ? 'Fortgeschritten' : 'Experte';
  return <span className={`badge ${cls}`}>{'●'.repeat(d)} {label}</span>;
}

export function ProgressBar({ value, navy }: { value: number; navy?: boolean }) {
  return (
    <div className={`progress ${navy ? 'navy' : ''}`} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

export function SchematicLabel({ text = 'Schematische Darstellung (eigene didaktische Illustration)' }: { text?: string }) {
  return <span className="label-schematic">📐 {text}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
