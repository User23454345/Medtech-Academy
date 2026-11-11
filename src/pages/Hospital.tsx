import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { deviceById, hospitalAreaById, hospitalAreas, manufacturerById } from '../data/registry';
import { Rich, RichParagraphs } from '../lib/text';
import { Callout, Empty, PageHead, SchematicLabel, SourceList } from '../components/ui/Common';
import { Quiz } from '../components/ui/Quiz';
import { NotFound } from './Misc';

export function HospitalPage() {
  return (
    <div>
      <PageHead kicker="Medizintechnik im echten Einsatz" title="Virtuelles Krankenhaus" lead="Erkunde die Bereiche eines Krankenhauses. Klicke auf Geräte, um Zweck, Funktionsweise, Verbindungen zu anderen Geräten, typische Alarme und Sicherheitsaspekte zu sehen – und löse in jedem Bereich ein Lernszenario." />
      {hospitalAreas.length === 0 && <Empty>Noch keine Krankenhausbereiche angelegt.</Empty>}
      <div className="grid grid-3">
        {hospitalAreas.map((a) => (
          <Link key={a.id} to={`/krankenhaus/${a.id}`} className="card hover">
            <div className="ico-lg">{a.icon}</div>
            <div className="card-title mt-1">{a.name}</div>
            <p className="card-sub"><Rich text={a.description.slice(0, 150) + (a.description.length > 150 ? ' …' : '')} /></p>
            <div className="row mt-1" style={{ gap: 6 }}>
              <span className="badge navy">{a.placements.length} Geräte</span>
              {a.scenario && <span className="badge teal">Szenario</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function HospitalAreaPage() {
  const { id } = useParams();
  const a = id ? hospitalAreaById.get(id) : undefined;
  const [sel, setSel] = useState<number | null>(null);
  if (!a) return <NotFound />;
  const p = sel !== null ? a.placements[sel] : undefined;
  const d = p ? deviceById.get(p.deviceId) : undefined;
  return (
    <div>
      <PageHead kicker="Virtuelles Krankenhaus" title={`${a.icon} ${a.name}`} crumbs={[['Virtuelles Krankenhaus', '/krankenhaus'], [a.name]]} />
      <RichParagraphs text={a.description} />
      <div className="split">
        <div style={{ minWidth: 0 }}>
          <div className="room" role="group" aria-label={`Raum ${a.name}`}>
            <svg viewBox="0 0 160 90" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
              <rect x="6" y="6" width="34" height="22" rx="2" fill="#dbeafe" stroke="#93c5fd" />
              <line x1="23" y1="6" x2="23" y2="28" stroke="#93c5fd" />
              <rect x="120" y="4" width="34" height="4" rx="1" fill="#cbd5e1" />
              <rect x="0" y="52" width="160" height="0.6" fill="#cbd5e1" />
            </svg>
            {a.placements.map((pl, i) => {
              const dev = deviceById.get(pl.deviceId);
              return (
                <button key={i} className={`room-hotspot ${sel === i ? 'active' : ''}`} style={{ left: `${pl.x}%`, top: `${pl.y}%` }} onClick={() => setSel(i)}>
                  <span className="pulse" />
                  {dev?.name ?? pl.deviceId}
                </button>
              );
            })}
          </div>
          <div className="row between mt-1">
            <span className="small muted">Klicke auf ein Gerät im Raum.</span>
            <SchematicLabel text="Schematische Raumdarstellung" />
          </div>
          <h3>Wie die Geräte zusammenarbeiten</h3>
          <RichParagraphs text={a.interplay} />
          {a.scenario && (
            <section className="section">
              <h2>🎬 Lernszenario: {a.scenario.title}</h2>
              <RichParagraphs text={a.scenario.intro} />
              <Callout variant="vereinfachung" title="Fiktives Lernszenario">
                Das Szenario ist frei erfunden, enthält keine realen Patientendaten und vermittelt technische Zusammenhänge – keine
                klinischen Handlungsanweisungen.
              </Callout>
              <Quiz quizKey={`hospital:${a.id}`} title={a.scenario.title} questions={a.scenario.questions} />
            </section>
          )}
        </div>
        <aside className="sticky">
          <div className="card" aria-live="polite">
            {!p ? (
              <span className="muted small">👈 Wähle ein Gerät, um Details zu sehen.</span>
            ) : (
              <>
                <div className="card-title">{d?.name ?? p.deviceId}</div>
                <p className="small"><strong>Rolle hier:</strong> <Rich text={p.role} /></p>
                {d && (
                  <>
                    <p className="small"><strong>Zweck:</strong> <Rich text={d.short} /></p>
                    <p className="small"><strong>Funktionsweise:</strong> <Rich text={d.principle.einfach.split(/\n\s*\n/)[0]} /></p>
                    <p className="small"><strong>Hersteller (Beispiele):</strong> {d.manufacturers.slice(0, 4).map((m) => manufacturerById.get(m.manufacturerId)?.name ?? m.manufacturerId).join(', ')}</p>
                  </>
                )}
                {p.connections && p.connections.length > 0 && (<><strong className="small">🔗 Verbindungen</strong><ul className="small">{p.connections.map((c, i) => <li key={i}><Rich text={c} /></li>)}</ul></>)}
                {p.alarms && p.alarms.length > 0 && (<><strong className="small">🔔 Typische Alarme</strong><ul className="small">{p.alarms.map((c, i) => <li key={i}><Rich text={c} /></li>)}</ul></>)}
                {p.safety && p.safety.length > 0 && (<><strong className="small">⛑️ Sicherheitsaspekte</strong><ul className="small">{p.safety.map((c, i) => <li key={i}><Rich text={c} /></li>)}</ul></>)}
                {d && <Link to={`/geraete/${d.id}`} className="btn sm">Zum Geräteprofil →</Link>}
              </>
            )}
          </div>
        </aside>
      </div>
      <SourceList ids={a.sources} updated={a.updated} />
    </div>
  );
}
