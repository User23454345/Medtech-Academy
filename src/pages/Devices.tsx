import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { CategoryId, Device, Economics, FieldId } from '../types/content';
import {
  categories,
  categoryById,
  deviceById,
  devices,
  fieldById,
  fields,
  glossaryById,
  manufacturerById,
  moduleById,
  simById,
  sourceById,
} from '../data/registry';
import { completeDailyTask, useProgress, visitDevice } from '../lib/progress';
import { deviceOfTheDay } from '../lib/tasks';
import { Rich, RichParagraphs } from '../lib/text';
import { formatDate, normalize } from '../lib/util';
import { BlockDiagramView } from '../components/ui/BlockDiagramView';
import { DeviceMiniCard } from '../components/ui/Blocks';
import { Callout, Empty, Leveled, PageHead, SourceList, Tabs } from '../components/ui/Common';
import { Quiz } from '../components/ui/Quiz';
import { SimEmbed } from '../components/ui/SimEmbed';
import { NotFound } from './Misc';

const DEPTH_LABEL: Record<Device['depth'], string> = {
  profil: 'Geräteprofil',
  vertieft: 'Vertieft + Simulation',
  vollmodul: 'Vollständiges Lernmodul',
};

export function DeviceCard({ d }: { d: Device }) {
  const cat = categoryById.get(d.category);
  const visited = useProgress((s) => !!s.visitedDevices[d.id]);
  return (
    <Link to={`/geraete/${d.id}`} className="card hover device-card">
      <div className="top">
        <span className="ic" style={{ background: `${cat?.color}18` }}>{cat?.icon}</span>
        <span className="row" style={{ gap: 4 }}>
          {d.depth !== 'profil' && <span className="badge teal">{d.depth === 'vollmodul' ? '★ Lernmodul' : '🧪 Simulation'}</span>}
          {visited && <span className="badge ok" title="angesehen">✓</span>}
        </span>
      </div>
      <div>
        <div className="card-title">{d.name}</div>
        <p className="card-sub"><Rich text={d.short} /></p>
      </div>
      <div className="meta">
        <span className="badge" style={{ background: `${cat?.color}14`, color: cat?.color }}>{cat?.name}</span>
        {d.mdrClass && <span className="badge outline">MDR {d.mdrClass}</span>}
      </div>
    </Link>
  );
}

export function Catalog() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const cat = (params.get('kategorie') ?? '') as CategoryId | '';
  const field = (params.get('fachbereich') ?? '') as FieldId | '';
  const [depth, setDepth] = useState<'' | Device['depth']>('');
  const [stk, setStk] = useState(false);
  const [mtk, setMtk] = useState(false);
  const [sort, setSort] = useState<'name' | 'kategorie'>('kategorie');

  function setParam(k: string, v: string) {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  }

  const list = useMemo(() => {
    const nq = normalize(q);
    let l = devices.filter((d) => {
      if (cat && d.category !== cat) return false;
      if (field && !d.fields.includes(field)) return false;
      if (depth && d.depth !== depth) return false;
      if (stk && d.maintenance.stk === 'nein') return false;
      if (mtk && d.maintenance.mtk === 'nein') return false;
      if (nq) {
        const hay = normalize([d.name, ...(d.aliases ?? []), d.short, d.purpose, ...d.applications, ...d.manufacturers.flatMap((m) => [manufacturerById.get(m.manufacturerId)?.name ?? '', ...(m.products ?? [])])].join(' '));
        return nq.split(' ').every((t) => hay.includes(t));
      }
      return true;
    });
    l = l.slice().sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name, 'de')
        : categories.findIndex((c) => c.id === a.category) - categories.findIndex((c) => c.id === b.category) || a.name.localeCompare(b.name, 'de'),
    );
    return l;
  }, [q, cat, field, depth, stk, mtk, sort]);

  const grouped = sort === 'kategorie' && !q;

  return (
    <div>
      <PageHead
        kicker="Der große Geräte-Katalog"
        title={`${devices.length} Medizintechnikgeräte`}
        lead="Systematisch nach Kategorien und Fachbereichen geordnet – jedes Gerät mit Funktionsprinzip auf drei Ebenen, anklickbarem Funktionsdiagramm, technischen Daten, Herstellern, Wartung & Prüfung und Wissenstest."
      >
        <div className="row">
          <Link to="/vergleich" className="btn secondary sm">⚖️ Geräte vergleichen</Link>
        </div>
      </PageHead>

      <div className="filterbar">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Gerät, Hersteller oder Produkt suchen …" aria-label="Geräte durchsuchen" />
        <select className="input" style={{ maxWidth: 260 }} value={cat} onChange={(e) => setParam('kategorie', e.target.value)} aria-label="Kategorie">
          <option value="">Alle Kategorien</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 260 }} value={field} onChange={(e) => setParam('fachbereich', e.target.value)} aria-label="Fachbereich">
          <option value="">Alle Fachbereiche</option>
          {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 220 }} value={depth} onChange={(e) => setDepth(e.target.value as Device['depth'] | '')} aria-label="Lerntiefe">
          <option value="">Jede Lerntiefe</option>
          <option value="vollmodul">★ Vollständiges Lernmodul</option>
          <option value="vertieft">🧪 Mit Simulation</option>
          <option value="profil">Geräteprofil</option>
        </select>
        <button className={`chip ${stk ? 'active' : ''}`} onClick={() => setStk(!stk)}>STK-relevant</button>
        <button className={`chip ${mtk ? 'active' : ''}`} onClick={() => setMtk(!mtk)}>MTK-relevant</button>
        <select className="input" style={{ maxWidth: 170 }} value={sort} onChange={(e) => setSort(e.target.value as 'name' | 'kategorie')} aria-label="Sortierung">
          <option value="kategorie">nach Kategorie</option>
          <option value="name">A–Z</option>
        </select>
      </div>
      <p className="small muted">{list.length} Treffer</p>

      {list.length === 0 && <Empty>Keine Geräte gefunden. Versuche einen anderen Suchbegriff oder entferne Filter.</Empty>}

      {grouped
        ? categories
            .filter((c) => list.some((d) => d.category === c.id))
            .map((c) => (
              <section key={c.id} className="section">
                <div className="section-head">
                  <h2>{c.icon} {c.name}</h2>
                  <span className="small muted">{c.short} · {list.filter((d) => d.category === c.id).length} Geräte</span>
                </div>
                <div className="grid grid-3">{list.filter((d) => d.category === c.id).map((d) => <DeviceCard key={d.id} d={d} />)}</div>
              </section>
            ))
        : <div className="grid grid-3">{list.map((d) => <DeviceCard key={d.id} d={d} />)}</div>}
    </div>
  );
}

export function EconomicsView({ e }: { e: Economics }) {
  return (
    <div>
      {e.priceStatus === 'belegt' && e.priceRanges && e.priceRanges.length > 0 ? (
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>Segment</th><th>Richtwert</th><th>Stand</th><th>Quelle</th></tr></thead>
            <tbody>
              {e.priceRanges.map((p, i) => (
                <tr key={i}>
                  <td>{p.segment}</td>
                  <td>{p.range} {p.currency}</td>
                  <td>{formatDate(p.date)}</td>
                  <td>{sourceById.get(p.sourceId)?.title ?? p.sourceId}</td>
                </tr>
              ))}
            </tbody>
            <caption>Richtwerte ohne Gewähr. Reale Preise hängen von Ausstattung, Verhandlung, Rahmenverträgen und Servicepaketen ab.</caption>
          </table>
        </div>
      ) : (
        <Callout variant="info" title="Keine belegten Preisangaben">
          Für dieses Gerät liegen noch keine belastbaren, öffentlich belegten Preisangaben mit Quelle und Datum vor. Statt geschätzter
          Zahlen zeigen wir deshalb die Faktoren, die den Preis bestimmen. Medizintechnikpreise werden meist individuell verhandelt
          (Ausschreibungen, Rahmenverträge, Einkaufsgemeinschaften) und sind selten öffentlich gelistet.
        </Callout>
      )}
      <h4>Was den Preis beeinflusst</h4>
      <ul>{e.costFactors.map((c, i) => <li key={i}><Rich text={c} /></li>)}</ul>
      {e.runningCosts && (
        <>
          <h4>Folgekosten & Service</h4>
          <RichParagraphs text={e.runningCosts} />
        </>
      )}
    </div>
  );
}

type DeviceTab = 'ueberblick' | 'funktion' | 'technik' | 'hersteller' | 'kosten' | 'wartung' | 'quiz';

export function DeviceDetail() {
  const { id } = useParams();
  const d = id ? deviceById.get(id) : undefined;
  const [tab, setTab] = useState<DeviceTab>('ueberblick');
  const [selComp, setSelComp] = useState<number | null>(null);

  useEffect(() => {
    setTab('ueberblick');
    setSelComp(null);
    if (d) {
      visitDevice(d.id, d.name);
      if (deviceOfTheDay()?.id === d.id) completeDailyTask(`geraet-${d.id}`, `Gerät des Tages: ${d.name}`, 10);
    }
  }, [d]);

  if (!d) return <NotFound />;
  const cat = categoryById.get(d.category)!;
  const mod = d.moduleId ? moduleById.get(d.moduleId) : undefined;
  const stkLabel = { ja: 'typischerweise ja', nein: 'typischerweise nein', abhaengig: 'abhängig von Gerät/Herstellerangabe' };

  return (
    <div>
      <PageHead kicker={`${cat.icon} ${cat.name}`} title={d.name} lead={d.short} crumbs={[['Geräte-Katalog', '/geraete'], [cat.name, `/geraete?kategorie=${cat.id}`], [d.name]]}>
        <div className="row">
          <span className="badge teal">{DEPTH_LABEL[d.depth]}</span>
          {d.mdrClass && <span className="badge outline" title="typische Risikoklasse nach MDR – maßgeblich ist die Herstellerangabe">MDR-Klasse (typisch) {d.mdrClass}</span>}
          {d.fields.map((f) => <Link key={f} to={`/fachbereiche/${f}`} className="badge navy">{fieldById.get(f)?.name}</Link>)}
          <span className="stand">🗓️ Stand {formatDate(d.updated)}</span>
        </div>
        {d.aliases && d.aliases.length > 0 && <p className="small muted mt-1 mb-0">Auch: {d.aliases.join(', ')}</p>}
        {mod && (
          <div className="callout merke mt-2" style={{ maxWidth: 820 }}>
            <div className="callout-title">★ Vollständiges Lernmodul verfügbar</div>
            <Link to={`/modul/${mod.id}`} className="btn sm">Zum Modul „{mod.title}“ ({mod.lessons.length} Lektionen) →</Link>
          </div>
        )}
      </PageHead>

      <Tabs<DeviceTab>
        tabs={[
          ['ueberblick', 'Überblick'],
          ['funktion', 'Funktion & Aufbau'],
          ['technik', 'Technische Daten'],
          ['hersteller', 'Hersteller & Modelle'],
          ['kosten', 'Wirtschaftlichkeit'],
          ['wartung', 'Wartung & Prüfung'],
          ['quiz', `Wissenstest (${d.quiz.length})`],
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'ueberblick' && (
        <div className="split">
          <div className="prose" style={{ maxWidth: 'none' }}>
            <h3 className="mt-0">Medizinischer Zweck</h3>
            <RichParagraphs text={d.purpose} />
            <h3>Typische Einsatzgebiete</h3>
            <ul>{d.applications.map((a, i) => <li key={i}><Rich text={a} /></li>)}</ul>
            <h3>Klinische Bedeutung</h3>
            <RichParagraphs text={d.clinicalRelevance} />
            <h3>Historische Entwicklung</h3>
            <RichParagraphs text={d.history} />
            <h3>Funktionsprinzip in Kürze</h3>
            <RichParagraphs text={d.principle.einfach} />
            <button className="btn secondary sm" onClick={() => setTab('funktion')}>Ausführlich: Funktion & Aufbau →</button>
          </div>
          <aside className="stack">
            <div className="card">
              <div className="card-title">Steckbrief</div>
              <div className="kv mt-1">
                <div>Kategorie</div><div>{cat.name}</div>
                <div>MDR (typisch)</div><div>{d.mdrClass ?? '–'}</div>
                <div>STK</div><div>{stkLabel[d.maintenance.stk]}</div>
                <div>MTK</div><div>{stkLabel[d.maintenance.mtk]}</div>
                <div>Hersteller</div><div>{d.manufacturers.length}</div>
              </div>
            </div>
            {d.glossary && d.glossary.length > 0 && (
              <div className="card">
                <div className="card-title">Begriffe</div>
                <div className="row mt-1" style={{ gap: 6 }}>
                  {d.glossary.map((g) => {
                    const t = glossaryById.get(g);
                    return t ? <Link key={g} to={`/lexikon/${g}`} className="badge navy">{t.abbr ?? t.term}</Link> : null;
                  })}
                </div>
              </div>
            )}
            {d.related && d.related.length > 0 && (
              <div className="card">
                <div className="card-title">Verwandte Geräte</div>
                <div className="stack mt-1" style={{ gap: 6 }}>
                  {d.related.map((r) => deviceById.get(r)).filter(Boolean).map((r) => <Link key={r!.id} to={`/geraete/${r!.id}`} className="small">→ {r!.name}</Link>)}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {tab === 'funktion' && (
        <div>
          <Leveled levels={d.principle} title="Funktionsprinzip" />
          {d.diagram && <BlockDiagramView diagram={d.diagram} caption={`Vereinfachter Signal- und Funktionsfluss: ${d.name}`} />}
          <h3>Aufbau – Komponenten anklicken</h3>
          <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.3fr)', gap: 16 }}>
            <div className="stack" style={{ gap: 6 }}>
              {d.components.map((c, i) => (
                <button key={i} className={`opt ${selComp === i ? 'sel' : ''}`} onClick={() => setSelComp(i)} style={{ marginBottom: 0 }}>
                  <span className="key">{i + 1}</span>
                  {c.name}
                </button>
              ))}
            </div>
            <div className="card" style={{ alignSelf: 'start', position: 'sticky', top: 80 }} aria-live="polite">
              {selComp === null ? (
                <span className="muted small">👈 Wähle eine Komponente, um ihre Funktion zu sehen.</span>
              ) : (
                <>
                  <div className="card-title">{d.components[selComp].name}</div>
                  <RichParagraphs text={d.components[selComp].function} className="small" />
                </>
              )}
            </div>
          </div>
          {d.sims && d.sims.filter((s) => simById.has(s)).map((s) => <SimEmbed key={s} simId={s} />)}
        </div>
      )}

      {tab === 'technik' && (
        <div>
          <Callout variant="info" title="Typische Größenordnungen">
            Die Angaben sind typische Werte bzw. Bereiche dieser Geräteklasse aus Fachliteratur und Normen – keine Spezifikation eines
            bestimmten Modells. Verbindlich sind ausschließlich die technischen Daten des jeweiligen Herstellers.
          </Callout>
          {d.specs.length > 0 && (
            <div className="table-wrap">
              <table className="t">
                <thead><tr><th>Parameter</th><th>Typischer Wert / Bereich</th><th>Hinweis</th></tr></thead>
                <tbody>{d.specs.map((s, i) => <tr key={i}><td><strong>{s.param}</strong></td><td><Rich text={s.typical} /></td><td className="small"><Rich text={s.note ?? ''} /></td></tr>)}</tbody>
              </table>
            </div>
          )}
          <div className="grid grid-2 mt-2">
            {d.sensors && d.sensors.length > 0 && (
              <div className="card"><div className="card-title">📡 Sensoren</div><ul className="small mb-0">{d.sensors.map((s, i) => <li key={i}><Rich text={s} /></li>)}</ul></div>
            )}
            {d.interfaces && d.interfaces.length > 0 && (
              <div className="card"><div className="card-title">🔌 Anschlüsse & Schnittstellen</div><ul className="small mb-0">{d.interfaces.map((s, i) => <li key={i}><Rich text={s} /></li>)}</ul></div>
            )}
            {d.power && <div className="card"><div className="card-title">🔋 Stromversorgung</div><p className="small mb-0"><Rich text={d.power} /></p></div>}
            <div className="card"><div className="card-title">⛑️ Sicherheitsfunktionen</div><ul className="small mb-0">{d.safetyFeatures.map((s, i) => <li key={i}><Rich text={s} /></li>)}</ul></div>
          </div>
          {d.standards && d.standards.length > 0 && <SourceList ids={d.standards} title="Relevante Normen & Vorschriften" />}
        </div>
      )}

      {tab === 'hersteller' && (
        <div>
          <Callout variant="info" title="Herstellerangaben vs. didaktische Einordnung">
            Genannt werden bekannte Hersteller und Produktfamilien dieser Geräteklasse (ohne Anspruch auf Vollständigkeit und ohne
            Wertung). Produktbezeichnungen ändern sich; aktuelle Modelle, Bilder und Datenblätter finden sich auf den offiziellen
            Herstellerseiten. Geräteabbildungen auf dieser Plattform sind schematische Eigenillustrationen.
          </Callout>
          <div className="grid grid-2">
            {d.manufacturers.map((m) => {
              const man = manufacturerById.get(m.manufacturerId);
              return (
                <div key={m.manufacturerId} className="card">
                  <div className="row between">
                    {man ? <Link to={`/hersteller/${man.id}`} className="card-title">{man.name}</Link> : <span className="card-title">{m.manufacturerId}</span>}
                    {man && <span className="badge">{man.country}</span>}
                  </div>
                  {m.products && m.products.length > 0 && (
                    <div className="row mt-1" style={{ gap: 6 }}>{m.products.map((p) => <span key={p} className="badge navy">{p}</span>)}</div>
                  )}
                  {man && <a className="small mt-1" style={{ display: 'inline-block' }} href={man.website} target="_blank" rel="noreferrer noopener">Offizielle Website ↗</a>}
                </div>
              );
            })}
          </div>
          {d.modelDifferences && (
            <>
              <h3>Unterschiede zwischen Geräteklassen & Modellen</h3>
              <RichParagraphs text={d.modelDifferences} />
            </>
          )}
          <Link to={`/vergleich?ids=${d.id}`} className="btn secondary sm mt-1">Mit anderen Geräten vergleichen →</Link>
        </div>
      )}

      {tab === 'kosten' && <EconomicsView e={d.economics} />}

      {tab === 'wartung' && (
        <div className="grid grid-2">
          <div className="card">
            <div className="card-title">✅ Prüfungen & Instandhaltung</div>
            <ul className="small">{d.maintenance.checks.map((c, i) => <li key={i}><Rich text={c} /></li>)}</ul>
            <div className="kv">
              <div>STK</div><div>{stkLabel[d.maintenance.stk]}</div>
              <div>MTK</div><div>{stkLabel[d.maintenance.mtk]}</div>
            </div>
            <p className="tiny muted mt-1 mb-0">Einordnung nach MPBetreibV als Lernhilfe. Verbindlich sind Herstellerangaben, Zweckbestimmung und die aktuelle Fassung der Verordnung.</p>
          </div>
          <div className="card">
            <div className="card-title">⚠️ Typische Fehlerbilder</div>
            <ul className="small">{d.maintenance.typicalFaults.map((c, i) => <li key={i}><Rich text={c} /></li>)}</ul>
            {d.maintenance.wearParts && (
              <>
                <div className="card-title mt-1">🔩 Verschleißteile</div>
                <ul className="small mb-0">{d.maintenance.wearParts.map((c, i) => <li key={i}><Rich text={c} /></li>)}</ul>
              </>
            )}
          </div>
          {d.maintenance.notes && <div className="card" style={{ gridColumn: '1 / -1' }}><RichParagraphs text={d.maintenance.notes} className="small" /></div>}
          <div style={{ gridColumn: '1 / -1' }}>
            <Callout variant="sicherheit">
              Arbeiten an Medizinprodukten dürfen nur von Personen mit entsprechender Ausbildung, Kenntnis und Erfahrung nach den
              Vorgaben des Herstellers durchgeführt werden. Schutzeinrichtungen dürfen niemals überbrückt werden.
            </Callout>
          </div>
        </div>
      )}

      {tab === 'quiz' && (d.quiz.length > 0 ? <Quiz quizKey={`device:${d.id}`} title={`Wissenstest: ${d.name}`} questions={d.quiz} /> : <Empty>Für dieses Gerät gibt es noch keine Quizfragen.</Empty>)}

      <SourceList ids={d.sources} updated={d.updated} />
    </div>
  );
}

const COMPARE_ROWS: [string, (d: Device) => string][] = [
  ['Kategorie', (d) => categoryById.get(d.category)?.name ?? ''],
  ['Zweck', (d) => d.purpose],
  ['Funktionsprinzip', (d) => d.principle.einfach],
  ['Sensoren', (d) => (d.sensors ?? []).join(' · ') || '–'],
  ['Schnittstellen', (d) => (d.interfaces ?? []).join(' · ') || '–'],
  ['Stromversorgung', (d) => d.power ?? '–'],
  ['Sicherheitsfunktionen', (d) => d.safetyFeatures.join(' · ')],
  ['MDR-Klasse (typisch)', (d) => d.mdrClass ?? '–'],
  ['STK / MTK', (d) => `${d.maintenance.stk} / ${d.maintenance.mtk}`],
  ['Typische Fehler', (d) => d.maintenance.typicalFaults.slice(0, 4).join(' · ')],
  ['Hersteller', (d) => d.manufacturers.map((m) => manufacturerById.get(m.manufacturerId)?.name ?? m.manufacturerId).join(', ')],
  ['Preisfaktoren', (d) => d.economics.costFactors.slice(0, 3).join(' · ')],
];

export function ComparePage() {
  const [params, setParams] = useSearchParams();
  const ids = (params.get('ids') ?? '').split(',').filter((x) => deviceById.has(x));
  const chosen = ids.map((i) => deviceById.get(i)!);
  const [add, setAdd] = useState('');
  function setIds(next: string[]) {
    setParams({ ids: next.join(',') }, { replace: true });
  }
  const specParams = Array.from(new Set(chosen.flatMap((d) => d.specs.map((s) => s.param))));
  return (
    <div>
      <PageHead kicker="Gerätevergleich" title="Geräte & Geräteklassen vergleichen" lead="Wähle bis zu vier Geräte aus und vergleiche Funktionsprinzip, technische Daten, Sicherheit, Prüfpflichten und Hersteller nebeneinander." crumbs={[['Geräte-Katalog', '/geraete'], ['Vergleich']]} />
      <Callout variant="info" title="Was hier verglichen wird">
        Verglichen werden Geräteklassen mit typischen Werten aus Fachliteratur (didaktische Einordnung). Modellspezifische Daten
        (Herstellerangaben) und unabhängige Bewertungen sind davon klar zu unterscheiden und auf den Herstellerseiten bzw. in
        Prüfberichten nachzulesen.
      </Callout>
      <div className="row mb-2">
        <select className="input" style={{ maxWidth: 380 }} value={add} onChange={(e) => setAdd(e.target.value)} aria-label="Gerät hinzufügen">
          <option value="">Gerät hinzufügen …</option>
          {categories.map((c) => (
            <optgroup key={c.id} label={c.name}>
              {devices.filter((d) => d.category === c.id && !ids.includes(d.id)).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </optgroup>
          ))}
        </select>
        <button className="btn" disabled={!add || ids.length >= 4} onClick={() => { setIds([...ids, add]); setAdd(''); }}>Hinzufügen</button>
        {ids.length > 0 && <button className="btn ghost" onClick={() => setIds([])}>Alle entfernen</button>}
      </div>
      {chosen.length === 0 ? (
        <Empty>Noch keine Geräte gewählt. Tipp: Vergleiche z. B. Intensivrespirator, Transportbeatmungsgerät und CPAP-Gerät.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th style={{ minWidth: 150 }}>Merkmal</th>
                {chosen.map((d) => (
                  <th key={d.id} style={{ minWidth: 220 }}>
                    <Link to={`/geraete/${d.id}`}>{d.name}</Link>{' '}
                    <button className="btn ghost sm" aria-label={`${d.name} entfernen`} onClick={() => setIds(ids.filter((x) => x !== d.id))}>✕</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map(([label, fn]) => (
                <tr key={label}><td><strong>{label}</strong></td>{chosen.map((d) => <td key={d.id} className="small"><Rich text={fn(d)} /></td>)}</tr>
              ))}
              {specParams.map((p) => (
                <tr key={p}>
                  <td><strong>{p}</strong></td>
                  {chosen.map((d) => <td key={d.id} className="small"><Rich text={d.specs.find((s) => s.param === p)?.typical ?? '–'} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {chosen.length > 0 && (
        <section className="section">
          <h3>Verwandte Geräte</h3>
          <div className="grid grid-3" style={{ gap: 10 }}>
            {Array.from(new Set(chosen.flatMap((d) => d.related ?? []))).filter((r) => !ids.includes(r)).map((r) => deviceById.get(r)).filter(Boolean).slice(0, 6).map((d) => <DeviceMiniCard key={d!.id} d={d!} />)}
          </div>
        </section>
      )}
    </div>
  );
}

