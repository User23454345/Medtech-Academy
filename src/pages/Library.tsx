import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ComponentEntry, GlossaryCategory, Source, TestEquipment } from '../types/content';
import {
  componentById,
  componentEntries,
  deviceById,
  devices,
  docTypes,
  glossary,
  glossaryById,
  manufacturerById,
  manufacturers,
  sources,
  testEquipment,
  testEquipmentById,
} from '../data/registry';
import { Rich, RichParagraphs } from '../lib/text';
import { normalize } from '../lib/util';
import { Blocks, DeviceMiniCard } from '../components/ui/Blocks';
import { Callout, Empty, Leveled, PageHead, SourceList } from '../components/ui/Common';
import { Quiz } from '../components/ui/Quiz';
import { SimEmbed } from '../components/ui/SimEmbed';
import { EconomicsView } from './Devices';
import { NotFound } from './Misc';

function useFilter<T>(list: T[], text: (t: T) => string) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const nq = normalize(q);
    if (!nq) return list;
    return list.filter((x) => nq.split(' ').every((t) => normalize(text(x)).includes(t)));
  }, [q, list, text]);
  return { q, setQ, filtered };
}

/* ---------------- Messgeräte & Prüfmittel ---------------- */

const TE_GROUP: Record<TestEquipment['group'], string> = {
  elektrisch: 'Elektrische Messgeräte',
  simulator: 'Patientensimulatoren',
  kalibrator: 'Kalibratoren & Referenzen',
  durchfluss: 'Durchfluss-, Gas- & Pumpenanalysatoren',
  allgemein: 'Allgemeine Prüfmittel',
};

export function TestEquipmentList() {
  const { q, setQ, filtered } = useFilter(testEquipment, (t) => `${t.name} ${t.purpose} ${t.measures.join(' ')}`);
  return (
    <div>
      <PageHead kicker="Die Werkzeuge der Medizintechnik" title="Messgeräte & Prüfmittel" lead="Vom Multimeter bis zum Sicherheitsanalysator: Messprinzip, Einsatzgebiet, typische technische Daten, Hersteller und Beispielmessungen – mit interaktiven Übungen im virtuellen Messlabor." />
      <div className="filterbar"><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Prüfmittel suchen …" aria-label="Prüfmittel suchen" /></div>
      {(Object.keys(TE_GROUP) as TestEquipment['group'][]).filter((g) => filtered.some((t) => t.group === g)).map((g) => (
        <section key={g} className="section">
          <h2>{TE_GROUP[g]}</h2>
          <div className="grid grid-3">
            {filtered.filter((t) => t.group === g).map((t) => (
              <Link key={t.id} to={`/messmittel/${t.id}`} className="card hover">
                <div className="card-title">{t.name}</div>
                <p className="card-sub"><Rich text={t.purpose} /></p>
                {t.sims && t.sims.length > 0 && <span className="badge teal mt-1">🧪 Übung im Messlabor</span>}
              </Link>
            ))}
          </div>
        </section>
      ))}
      {filtered.length === 0 && <Empty>Keine Prüfmittel gefunden.</Empty>}
    </div>
  );
}

export function TestEquipmentPage() {
  const { id } = useParams();
  const t = id ? testEquipmentById.get(id) : undefined;
  if (!t) return <NotFound />;
  return (
    <div>
      <PageHead kicker={TE_GROUP[t.group]} title={t.name} lead={t.purpose} crumbs={[['Messgeräte & Prüfmittel', '/messmittel'], [t.name]]} />
      <Leveled levels={t.principle} title="Funktionsweise & Messprinzip" />
      <div className="grid grid-2">
        <div className="card">
          <div className="card-title">📏 Messgrößen</div>
          <ul className="small mb-0">{t.measures.map((m, i) => <li key={i}><Rich text={m} /></li>)}</ul>
        </div>
        <div className="card">
          <div className="card-title">🛠️ Anwendung</div>
          <ul className="small mb-0">{t.usage.map((m, i) => <li key={i}><Rich text={m} /></li>)}</ul>
        </div>
      </div>
      {t.specs.length > 0 && (
        <>
          <h3>Typische technische Daten</h3>
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>Parameter</th><th>Typisch</th><th>Hinweis</th></tr></thead>
              <tbody>{t.specs.map((s, i) => <tr key={i}><td><strong>{s.param}</strong></td><td><Rich text={s.typical} /></td><td className="small"><Rich text={s.note ?? ''} /></td></tr>)}</tbody>
              <caption>Typische Größenordnungen der Geräteklasse – verbindlich sind die Herstellerdatenblätter.</caption>
            </table>
          </div>
        </>
      )}
      <h3>Hersteller & Modelle</h3>
      <div className="grid grid-3">
        {t.manufacturers.map((m) => {
          const man = manufacturerById.get(m.manufacturerId);
          return (
            <div key={m.manufacturerId} className="card">
              {man ? <Link to={`/hersteller/${man.id}`} className="card-title">{man.name}</Link> : <span className="card-title">{m.manufacturerId}</span>}
              <div className="row mt-1" style={{ gap: 6 }}>{(m.products ?? []).map((p) => <span key={p} className="badge navy">{p}</span>)}</div>
            </div>
          );
        })}
      </div>
      <h3>Preise</h3>
      <EconomicsView e={t.economics} />
      <h3>Beispielmessung</h3>
      <Blocks blocks={t.example} ctx={`te-${t.id}`} />
      {t.sims?.map((s) => <SimEmbed key={s} simId={s} />)}
      {t.quiz.length > 0 && <Quiz quizKey={`te:${t.id}`} title={`Wissenstest: ${t.name}`} questions={t.quiz} />}
      <SourceList ids={t.sources} updated={t.updated} />
    </div>
  );
}

/* ---------------- Komponenten ---------------- */

const COMP_GROUP: Record<ComponentEntry['group'], string> = {
  sensorik: 'Sensorik',
  aktorik: 'Aktorik',
  fluidik: 'Fluidik',
  energie: 'Energieversorgung',
  elektronik: 'Elektronik',
  mechanik: 'Mechanik',
  verbindung: 'Verbindungstechnik',
  anzeige: 'Anzeige & Bedienung',
};

export function ComponentList() {
  const { q, setQ, filtered } = useFilter(componentEntries, (c) => `${c.name} ${c.function} ${c.failureModes.join(' ')}`);
  return (
    <div>
      <PageHead kicker="Ersatzteile & Komponenten" title="Komponenten-Lexikon" lead="Sensoren, Ventile, Pumpen, Akkus, Netzteile & Co.: Funktion, technisches Prinzip, typische Fehlerbilder und Beispiele aus realen Medizingeräten." />
      <div className="filterbar"><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Komponente suchen …" aria-label="Komponente suchen" /></div>
      {(Object.keys(COMP_GROUP) as ComponentEntry['group'][]).filter((g) => filtered.some((c) => c.group === g)).map((g) => (
        <section key={g} className="section">
          <h2>{COMP_GROUP[g]}</h2>
          <div className="grid grid-3">
            {filtered.filter((c) => c.group === g).map((c) => (
              <Link key={c.id} to={`/komponenten/${c.id}`} className="card hover">
                <div className="card-title">{c.name}</div>
                <p className="card-sub"><Rich text={c.function} /></p>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {filtered.length === 0 && <Empty>Keine Komponenten gefunden.</Empty>}
    </div>
  );
}

export function ComponentPage() {
  const { id } = useParams();
  const c = id ? componentById.get(id) : undefined;
  if (!c) return <NotFound />;
  return (
    <div>
      <PageHead kicker={`Komponente · ${COMP_GROUP[c.group]}`} title={c.name} lead={c.function} crumbs={[['Komponenten', '/komponenten'], [c.name]]} />
      <Leveled levels={c.principle} title="Technisches Prinzip" />
      <div className="grid grid-2">
        <div className="card"><div className="card-title">📍 Typische Einsatzbereiche</div><ul className="small mb-0">{c.applications.map((a, i) => <li key={i}><Rich text={a} /></li>)}</ul></div>
        <div className="card"><div className="card-title">⚠️ Häufige Fehlerbilder</div><ul className="small mb-0">{c.failureModes.map((a, i) => <li key={i}><Rich text={a} /></li>)}</ul></div>
      </div>
      {c.properties.length > 0 && (
        <>
          <h3>Relevante technische Eigenschaften</h3>
          <div className="table-wrap"><table className="t"><thead><tr><th>Eigenschaft</th><th>Typisch</th><th>Hinweis</th></tr></thead><tbody>{c.properties.map((p, i) => <tr key={i}><td><strong>{p.param}</strong></td><td><Rich text={p.typical} /></td><td className="small"><Rich text={p.note ?? ''} /></td></tr>)}</tbody></table></div>
        </>
      )}
      {c.sparePartNotes && <Callout variant="praxis" title="Ersatzteil-Identifikation"><RichParagraphs text={c.sparePartNotes} /></Callout>}
      {c.devices.length > 0 && (
        <>
          <h3>Beispiele aus konkreten Medizingeräten</h3>
          <div className="grid grid-3" style={{ gap: 10 }}>{c.devices.map((d) => deviceById.get(d)).filter(Boolean).map((d) => <DeviceMiniCard key={d!.id} d={d!} />)}</div>
        </>
      )}
      <SourceList ids={c.sources} updated={c.updated} />
    </div>
  );
}

/* ---------------- Hersteller ---------------- */

export function ManufacturerList() {
  const { q, setQ, filtered } = useFilter(manufacturers, (m) => `${m.name} ${m.country} ${m.productAreas.join(' ')} ${m.productFamilies.join(' ')}`);
  const [country, setCountry] = useState('');
  const countries = Array.from(new Set(manufacturers.map((m) => m.country))).sort();
  const list = filtered.filter((m) => !country || m.country === country);
  return (
    <div>
      <PageHead kicker="Herstellerkunde" title="Hersteller-Datenbank" lead="Wichtige Unternehmen der Medizintechnik mit Profil, Herkunft, Produktbereichen, bekannten Produktfamilien und Verknüpfung zu den Geräteprofilen." />
      <div className="filterbar">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hersteller oder Produktfamilie suchen …" aria-label="Hersteller suchen" />
        <select className="input" style={{ maxWidth: 220 }} value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Land">
          <option value="">Alle Länder</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="small muted">{list.length} Hersteller</span>
      </div>
      <div className="grid grid-3">
        {list.map((m) => {
          const count = devices.filter((d) => d.manufacturers.some((x) => x.manufacturerId === m.id)).length;
          return (
            <Link key={m.id} to={`/hersteller/${m.id}`} className="card hover">
              <div className="row between"><span className="card-title">{m.name}</span><span className="badge">{m.country}</span></div>
              <p className="card-sub">{m.productAreas.slice(0, 4).join(' · ')}</p>
              <span className="badge navy mt-1">{count} Geräteprofile</span>
            </Link>
          );
        })}
      </div>
      <p className="tiny muted mt-2">Die Darstellung ist redaktionell-neutral und ohne Wertung. Firmen- und Produktnamen sind Marken ihrer jeweiligen Inhaber.</p>
    </div>
  );
}

export function ManufacturerPage() {
  const { id } = useParams();
  const m = id ? manufacturerById.get(id) : undefined;
  if (!m) return <NotFound />;
  const devs = devices.filter((d) => d.manufacturers.some((x) => x.manufacturerId === m.id));
  const tes = testEquipment.filter((t) => t.manufacturers.some((x) => x.manufacturerId === m.id));
  return (
    <div>
      <PageHead kicker={`Hersteller · ${m.country}`} title={m.name} crumbs={[['Hersteller', '/hersteller'], [m.name]]}>
        <div className="row">
          {m.founded && <span className="badge">gegründet {m.founded}</span>}
          {m.headquarters && <span className="badge">📍 {m.headquarters}</span>}
          <a href={m.website} target="_blank" rel="noreferrer noopener" className="btn secondary sm">Offizielle Website ↗</a>
        </div>
      </PageHead>
      <div className="split">
        <div className="prose" style={{ maxWidth: 'none' }}>
          <h3 className="mt-0">Firmenprofil</h3>
          <RichParagraphs text={m.profile} />
          <h3>Historische Entwicklung</h3>
          <RichParagraphs text={m.history} />
          {m.specialties && (<><h3>Technische Besonderheiten</h3><RichParagraphs text={m.specialties} /></>)}
        </div>
        <aside className="stack">
          <div className="card"><div className="card-title">Produktbereiche</div><div className="row mt-1" style={{ gap: 6 }}>{m.productAreas.map((p) => <span key={p} className="badge">{p}</span>)}</div></div>
          <div className="card"><div className="card-title">Bekannte Produktfamilien</div><div className="row mt-1" style={{ gap: 6 }}>{m.productFamilies.map((p) => <span key={p} className="badge navy">{p}</span>)}</div></div>
        </aside>
      </div>
      {devs.length > 0 && (<section className="section"><h2>Verknüpfte Geräteprofile ({devs.length})</h2><div className="grid grid-3" style={{ gap: 10 }}>{devs.map((d) => <DeviceMiniCard key={d.id} d={d} />)}</div></section>)}
      {tes.length > 0 && (<section className="section"><h2>Prüfmittel</h2><div className="row">{tes.map((t) => <Link key={t.id} to={`/messmittel/${t.id}`} className="btn secondary sm">{t.name}</Link>)}</div></section>)}
      <SourceList ids={m.sources} updated={m.updated} />
    </div>
  );
}

/* ---------------- Technische Dokumentation ---------------- */

export function DocumentationPage() {
  return (
    <div>
      <PageHead kicker="Bibliothek" title="Technische Dokumentation & Schaltplan-Lexikon" lead="Welche Dokumentationsarten es gibt, was drinsteht, wie man sie liest und richtig einordnet – und wo man sie rechtmäßig bekommt." />
      <Callout variant="info" title="Herkunft von Unterlagen">
        Servicehandbücher und Schaltpläne sind oft urheberrechtlich geschützt und werden von Herstellern nur an geschultes Personal
        abgegeben. Diese Plattform zeigt daher ausschließlich didaktische Beispiele und erklärt Struktur und Lesetechnik – keine
        Herstellerunterlagen.
      </Callout>
      {docTypes.length === 0 && <Empty>Noch keine Dokumentationsarten angelegt.</Empty>}
      <div className="stack">
        {docTypes.map((d) => (
          <details key={d.id} id={d.id} className="acc">
            <summary>📄 {d.name}</summary>
            <div className="acc-body">
              <p><Rich text={d.purpose} /></p>
              <div className="grid grid-2">
                <div><h4>Typischer Inhalt</h4><ul className="small">{d.contents.map((c, i) => <li key={i}><Rich text={c} /></li>)}</ul></div>
                <div><h4>So liest du sie richtig</h4><ol className="small">{d.howToRead.map((c, i) => <li key={i}><Rich text={c} /></li>)}</ol></div>
              </div>
              <p className="small"><strong>Wo zu finden:</strong> <Rich text={d.whereToFind} /></p>
              {d.legal && <p className="small"><strong>Rechtlicher Rahmen:</strong> <Rich text={d.legal} /></p>}
              {d.example && <Blocks blocks={d.example} ctx={`doc-${d.id}`} />}
              <SourceList ids={d.sources} updated={d.updated} title="Quellen" />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Lexikon ---------------- */

const GL_CAT: Record<GlossaryCategory, string> = {
  technik: 'Technik',
  elektronik: 'Elektronik',
  medizin: 'Medizin',
  physik: 'Physik',
  messtechnik: 'Messtechnik',
  'norm-recht': 'Normen & Recht',
  abkuerzung: 'Abkürzungen',
  it: 'IT',
};

export function GlossaryPage() {
  const { q, setQ, filtered } = useFilter(glossary, (g) => `${g.term} ${g.abbr ?? ''} ${g.simple}`);
  const [cat, setCat] = useState<GlossaryCategory | ''>('');
  const list = filtered.filter((g) => !cat || g.category === cat);
  const letters = Array.from(new Set(list.map((g) => normalize(g.term).charAt(0).toUpperCase()))).sort();
  return (
    <div>
      <PageHead kicker="Wissenschaftliche Bibliothek" title="MedTech-Wissenslexikon" lead={`${glossary.length} Fachbegriffe, Abkürzungen, Formeln und Messgrößen – jeweils mit einfacher Definition, technischer Erklärung, Anwendungsbeispiel und Verknüpfung zu Geräten.`} />
      <div className="filterbar">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Begriff oder Abkürzung (z. B. PEEP, SpO2, STK) …" aria-label="Lexikon durchsuchen" />
        <button className={`chip ${cat === '' ? 'active' : ''}`} onClick={() => setCat('')}>Alle</button>
        {(Object.keys(GL_CAT) as GlossaryCategory[]).map((c) => <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>{GL_CAT[c]}</button>)}
      </div>
      {list.length === 0 && <Empty>Kein Begriff gefunden. Versuche die <Link to={`/suche?q=${encodeURIComponent(q)}`}>plattformweite Suche</Link>.</Empty>}
      {letters.map((l) => (
        <section key={l} className="section" style={{ marginTop: 20 }}>
          <h2 style={{ marginTop: 0 }}>{l}</h2>
          <div className="grid grid-3" style={{ gap: 10 }}>
            {list.filter((g) => normalize(g.term).charAt(0).toUpperCase() === l).map((g) => (
              <Link key={g.id} to={`/lexikon/${g.id}`} className="card hover" style={{ padding: 14 }}>
                <div className="row between"><span className="card-title">{g.term}</span>{g.abbr && <span className="badge navy">{g.abbr}</span>}</div>
                <p className="card-sub small"><Rich text={g.simple} /></p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function TermPage() {
  const { id } = useParams();
  const g = id ? glossaryById.get(id) : undefined;
  if (!g) return <NotFound />;
  const backlinks = devices.filter((d) => d.glossary?.includes(g.id) && !g.devices?.includes(d.id));
  return (
    <div className="content narrow" style={{ padding: 0 }}>
      <PageHead kicker={`Lexikon · ${GL_CAT[g.category]}`} title={g.abbr ? `${g.term} (${g.abbr})` : g.term} crumbs={[['Lexikon', '/lexikon'], [g.term]]} />
      <div className="card mb-2"><div className="kicker">Einfach erklärt</div><RichParagraphs text={g.simple} /></div>
      <div className="card mb-2"><div className="kicker">Technische Erklärung</div><RichParagraphs text={g.technical} /></div>
      {g.formula && <div className="formula"><div className="f">{g.formula}</div></div>}
      <div className="card mb-2" style={{ background: '#f5f3ff' }}><div className="kicker" style={{ color: '#7c3aed' }}>Anwendungsbeispiel</div><RichParagraphs text={g.example} /></div>
      {((g.devices?.length ?? 0) > 0 || backlinks.length > 0) && (
        <>
          <h3>Verknüpfte Geräte</h3>
          <div className="grid grid-3" style={{ gap: 10 }}>{[...(g.devices ?? []).map((d) => deviceById.get(d)).filter(Boolean), ...backlinks].map((d) => <DeviceMiniCard key={d!.id} d={d!} />)}</div>
        </>
      )}
      {g.related && g.related.length > 0 && (
        <>
          <h3>Verwandte Begriffe</h3>
          <div className="row">{g.related.map((r) => glossaryById.get(r)).filter(Boolean).map((r) => <Link key={r!.id} to={`/lexikon/${r!.id}`} className="badge navy">{r!.term}</Link>)}</div>
        </>
      )}
      <p className="mt-2"><Link to={`/coach?q=${encodeURIComponent(g.term)}`} className="btn secondary sm">🤖 Den Coach dazu fragen</Link></p>
      {g.sources && <SourceList ids={g.sources} />}
    </div>
  );
}

/* ---------------- Quellen ---------------- */

const SRC_TYPE: Record<Source['type'], string> = {
  buch: 'Fachbücher',
  norm: 'Normen & Standards',
  gesetz: 'Gesetze & Verordnungen',
  artikel: 'Fachartikel (peer-reviewed)',
  hersteller: 'Herstellerdokumentation',
  behoerde: 'Behörden',
  fachgesellschaft: 'Fachgesellschaften & Leitlinien',
  web: 'Weitere Online-Quellen',
};

export function SourcesPage() {
  const { q, setQ, filtered } = useFilter(sources, (s) => `${s.title} ${s.authors ?? ''} ${s.publisher ?? ''}`);
  return (
    <div>
      <PageHead kicker="Wissenschaftliche Qualität" title="Quellenverzeichnis" lead={`Alle ${sources.length} Quellen, auf denen die Lerninhalte basieren. Jede Lektion und jedes Geräteprofil verweist auf die hier gelisteten Einträge.`} />
      <Callout variant="info" title="Umgang mit Normen und Gesetzen">
        Normen (DIN, EN, IEC, ISO) sind kostenpflichtig beim jeweiligen Normengeber erhältlich; zitiert werden Nummer, Titel und
        Ausgabestand. Gesetze und Verordnungen sind kostenfrei online verfügbar (gesetze-im-internet.de, EUR-Lex) – maßgeblich ist
        immer die aktuell gültige Fassung.
      </Callout>
      <div className="filterbar"><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Quelle suchen …" aria-label="Quelle suchen" /></div>
      {(Object.keys(SRC_TYPE) as Source['type'][]).filter((t) => filtered.some((s) => s.type === t)).map((t) => (
        <section key={t} className="section">
          <h2>{SRC_TYPE[t]}</h2>
          <SourceList ids={filtered.filter((s) => s.type === t).map((s) => s.id)} title="" />
        </section>
      ))}
    </div>
  );
}
