import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { search, type ResultKind } from '../lib/search';
import { Empty, PageHead } from '../components/ui/Common';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [input, setInput] = useState(q);
  const [kind, setKind] = useState<ResultKind | ''>('');
  useEffect(() => setInput(q), [q]);
  const hits = useMemo(() => search(q, 120), [q]);
  const kinds = Array.from(new Set(hits.map((h) => h.doc.kind)));
  const shown = hits.filter((h) => !kind || h.doc.kind === kind);
  return (
    <div className="content narrow" style={{ padding: 0 }}>
      <PageHead kicker="Plattformweite Suche" title={q ? `Suche: „${q}“` : 'Suche'} lead="Durchsucht Geräte, Lexikon und Abkürzungen, Lektionen, Komponenten, Prüfmittel, Hersteller, Fehlerbilder, Fälle und Simulationen." />
      <form className="row mb-2" onSubmit={(e) => { e.preventDefault(); setParams({ q: input }); }}>
        <input className="input" style={{ flex: 1 }} value={input} onChange={(e) => setInput(e.target.value)} placeholder="z. B. SpO2, Ableitstrom, Druckalarm, Dräger …" aria-label="Suchbegriff" autoFocus />
        <button className="btn">Suchen</button>
      </form>
      {kinds.length > 1 && (
        <div className="filterbar">
          <button className={`chip ${kind === '' ? 'active' : ''}`} onClick={() => setKind('')}>Alle ({hits.length})</button>
          {kinds.map((k) => <button key={k} className={`chip ${kind === k ? 'active' : ''}`} onClick={() => setKind(k)}>{k} ({hits.filter((h) => h.doc.kind === k).length})</button>)}
        </div>
      )}
      {q && shown.length === 0 && <Empty>Keine Treffer für „{q}“. Tipp: Probiere Abkürzungen (z. B. „NIBP“) oder allgemeinere Begriffe.</Empty>}
      <div className="stack" style={{ gap: 8 }}>
        {shown.map((h, i) => (
          <Link key={i} to={h.doc.href} className="card hover" style={{ padding: 14 }}>
            <div className="row between" style={{ flexWrap: 'nowrap' }}>
              <span className="card-title">{h.doc.title}</span>
              <span className="badge navy">{h.doc.kind}</span>
            </div>
            <p className="card-sub small">{h.doc.subtitle}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
