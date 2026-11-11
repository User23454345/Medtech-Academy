import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { DiagNode, TechCase } from '../types/content';
import { caseById, cases, deviceById, faultById, lessonIndex } from '../data/registry';
import { solveCase, solveFault, useProgress } from '../lib/progress';
import { Rich, RichParagraphs } from '../lib/text';
import { shuffle } from '../lib/util';
import { Callout, DifficultyBadge, Empty, PageHead, SourceList } from '../components/ui/Common';
import { SimEmbed } from '../components/ui/SimEmbed';
import { NotFound } from './Misc';

/* ------------------------------------------------------------------ */
/* Diagnosebaum                                                        */
/* ------------------------------------------------------------------ */

export function FaultPage() {
  const { id } = useParams();
  const f = id ? faultById.get(id) : undefined;
  const [path, setPath] = useState<{ node: DiagNode; choice?: number }[]>(() => (f ? [{ node: f.nodes[0] }] : []));
  const [result, setResult] = useState<{ text: string; resolved: boolean } | null>(null);
  const solved = useProgress((s) => (f ? !!s.solvedFaults[f.id] : false));
  if (!f) return <NotFound />;
  const nodeById = new Map(f.nodes.map((n) => [n.id, n]));
  const current = path[path.length - 1];

  function choose(i: number) {
    const opt = current.node.options[i];
    const newPath = [...path.slice(0, -1), { node: current.node, choice: i }];
    if (opt.result) {
      setPath(newPath);
      setResult(opt.result);
      if (opt.result.resolved) solveFault(f!.id, f!.title);
    } else if (opt.next && nodeById.has(opt.next)) {
      setPath([...newPath, { node: nodeById.get(opt.next)! }]);
    }
  }
  function restart() {
    setPath([{ node: f!.nodes[0] }]);
    setResult(null);
  }

  return (
    <div>
      <PageHead kicker="Fehlerbild · interaktiver Diagnosebaum" title={f.title} crumbs={[['Instandhaltung', '/instandhaltung'], [f.title]]}>
        <div className="row">
          <DifficultyBadge d={f.difficulty} />
          {solved && <span className="badge ok">✓ gelöst</span>}
          {f.devices.map((d) => deviceById.get(d)).filter(Boolean).map((d) => <Link key={d!.id} to={`/geraete/${d!.id}`} className="badge navy">{d!.name}</Link>)}
        </div>
      </PageHead>
      <div className="split">
        <div style={{ minWidth: 0 }}>
          <h3 className="mt-0">Fehlerbeschreibung</h3>
          <RichParagraphs text={f.description} />
          <div className="card mt-2">
            <div className="row between">
              <h3 className="mt-0 mb-0">🌳 Systematische Fehlersuche</h3>
              <button className="btn ghost sm" onClick={restart}>↺ Neu starten</button>
            </div>
            <div className="diag-path mt-2">
              {path.map((p, i) => (
                <div key={i} className={`diag-step ${p.choice !== undefined ? 'done' : ''}`}>
                  <div style={{ fontWeight: 600, color: 'var(--navy-800)' }}><Rich text={p.node.question} /></div>
                  {p.node.info && <p className="small muted mb-0"><Rich text={p.node.info} /></p>}
                  {p.choice !== undefined ? (
                    <div className="small mt-1">→ <strong>{p.node.options[p.choice].label}</strong></div>
                  ) : (
                    !result && (
                      <div className="stack mt-1" style={{ gap: 6 }}>
                        {p.node.options.map((o, oi) => (
                          <button key={oi} className="opt" style={{ marginBottom: 0 }} onClick={() => choose(oi)}>
                            <span className="key">{oi + 1}</span>
                            <Rich text={o.label} />
                          </button>
                        ))}
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
            {result && (
              <div className={`feedback ${result.resolved ? 'ok' : 'bad'}`}>
                <strong>{result.resolved ? '✓ Ergebnis' : 'ℹ️ Ergebnis'}</strong>
                <RichParagraphs text={result.text} />
                <button className="btn sm secondary" onClick={restart}>Anderen Pfad ausprobieren</button>
              </div>
            )}
          </div>

          <h3>Mögliche technische Ursachen</h3>
          <div className="stack" style={{ gap: 8 }}>
            {f.causes.map((c, i) => (
              <details key={i} className="acc">
                <summary>{c.cause}</summary>
                <div className="acc-body small"><RichParagraphs text={c.explanation} /></div>
              </details>
            ))}
          </div>
          <h3>Die zugrunde liegende Technik</h3>
          <RichParagraphs text={f.technique} />
        </div>
        <aside className="stack">
          <div className="card">
            <div className="card-title">🔍 Prüfschritte</div>
            <ol className="small mb-0">{f.checks.map((c, i) => <li key={i}><Rich text={c} /></li>)}</ol>
          </div>
          <div className="card">
            <div className="card-title">🗒️ Dokumentation</div>
            <ul className="small mb-0">{f.documentation.map((c, i) => <li key={i}><Rich text={c} /></li>)}</ul>
          </div>
          <Callout variant="sicherheit" title="Grenzen der eigenen Qualifikation">
            <RichParagraphs text={f.qualificationLimits} />
          </Callout>
        </aside>
      </div>
      <SourceList ids={f.sources} updated={f.updated} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fälle: Liste                                                        */
/* ------------------------------------------------------------------ */

export function CaseList({ mode }: { mode: 'service' | 'fall' }) {
  const [diff, setDiff] = useState<0 | 1 | 2 | 3>(0);
  const solved = useProgress((s) => s.solvedCases);
  const list = cases.filter((c) => (mode === 'service' ? c.usage !== 'fall' : c.usage !== 'service')).filter((c) => !diff || c.difficulty === diff);
  return (
    <div>
      {mode === 'service' ? (
        <PageHead
          kicker="Virtuelles Service-Labor"
          title="Simulierte Gerätestörungen lösen"
          lead="Du erhältst eine Störungsmeldung. Untersuche das Gerät mit Diagnoseschritten (jeder kostet Zeit), sammle Befunde, stelle eine Diagnose – und erfahre die technischen Zusammenhänge dahinter."
        />
      ) : (
        <PageHead
          kicker="Interaktive technische Fallbibliothek"
          title="Technische Fallbeispiele"
          lead="Praxisorientierte Fälle in zehn Schritten: Ausgangssituation, Technik, Fehlerbild, Messwerte, mögliche Ursachen, Untersuchung, Ergebnis, Erklärung, wissenschaftlicher Hintergrund und Quellen."
        />
      )}
      <div className="filterbar">
        {([0, 1, 2, 3] as const).map((d) => (
          <button key={d} className={`chip ${diff === d ? 'active' : ''}`} onClick={() => setDiff(d)}>
            {d === 0 ? 'Alle' : d === 1 ? '● Einsteiger' : d === 2 ? '●● Fortgeschritten' : '●●● Experte'}
          </button>
        ))}
        <span className="small muted">{list.length} Fälle · {list.filter((c) => solved[c.id]).length} gelöst</span>
      </div>
      {list.length === 0 ? (
        <Empty>Keine Fälle für diesen Filter.</Empty>
      ) : (
        <div className="grid grid-3">
          {list.map((c) => {
            const d = deviceById.get(c.deviceId);
            return (
              <Link key={c.id} to={`/faelle/${c.id}`} className="card hover">
                <div className="row between">
                  <DifficultyBadge d={c.difficulty} />
                  {solved[c.id] && <span className="badge ok">✓ {solved[c.id].score} P.</span>}
                </div>
                <div className="card-title mt-1">{c.title}</div>
                <p className="card-sub"><Rich text={c.problem} /></p>
                {d && <span className="badge navy mt-1">{d.name}</span>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fall-Engine                                                         */
/* ------------------------------------------------------------------ */

export function CasePage() {
  const { id } = useParams();
  const c = id ? caseById.get(id) : undefined;
  if (!c) return <NotFound />;
  return <CaseRunner key={c.id} c={c} />;
}

function CaseRunner({ c }: { c: TechCase }) {
  const [done, setDone] = useState<string[]>([]);
  const [guess, setGuess] = useState<string | null>(null);
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const hypotheses = useMemo(() => shuffle(c.hypotheses), [c]);
  const actions = useMemo(() => shuffle(c.actions), [c]);
  const minutes = done.reduce((a, aid) => a + (c.actions.find((x) => x.id === aid)?.minutes ?? 0), 0);
  const usefulDone = done.filter((aid) => c.actions.find((x) => x.id === aid)?.useful).length;
  const unnecessary = done.length - usefulDone;
  const device = deviceById.get(c.deviceId);
  const score = Math.max(0, Math.min(100, 100 - wrongGuesses.length * 25 - unnecessary * 5 - Math.max(0, minutes - 30) / 2));

  function submit() {
    if (!guess) return;
    const h = c.hypotheses.find((x) => x.id === guess)!;
    if (h.correct) {
      setFinished(true);
      solveCase(c.id, c.title, Math.round(score));
    } else if (!wrongGuesses.includes(guess)) {
      setWrongGuesses([...wrongGuesses, guess]);
    }
  }

  return (
    <div>
      <PageHead kicker={c.usage === 'fall' ? 'Fallbibliothek' : 'Virtuelles Service-Labor'} title={c.title} crumbs={[[c.usage === 'fall' ? 'Fallbibliothek' : 'Service-Labor', c.usage === 'fall' ? '/faelle' : '/service-labor'], [c.title]]}>
        <div className="row">
          <DifficultyBadge d={c.difficulty} />
          {device && <Link to={`/geraete/${device.id}`} className="badge navy">{device.name}</Link>}
        </div>
      </PageHead>
      <div className="split">
        <div style={{ minWidth: 0 }}>
          <section className="card">
            <div className="kicker">1 · Ausgangssituation</div>
            <RichParagraphs text={c.situation} />
            <div className="kicker mt-2">2 · Gerät & technische Grundlagen</div>
            <RichParagraphs text={c.background} />
            <div className="kicker mt-2">3 · Fehlerbild / Fragestellung</div>
            <p><strong><Rich text={c.problem} /></strong></p>
            {c.measurements.length > 0 && (
              <>
                <div className="kicker mt-2">4 · Messwerte & Informationen</div>
                <div className="kv">
                  {c.measurements.map((m, i) => (
                    <div key={i} style={{ display: 'contents' }}>
                      <div>{m.label}</div>
                      <div><Rich text={m.value} /></div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="section">
            <div className="section-head">
              <h2 className="mt-0">5 · Untersuchung durchführen</h2>
              <span className="badge navy">⏱ {minutes} min · {done.length} Schritte</span>
            </div>
            <p className="small muted">Wähle sinnvolle Untersuchungsschritte. Systematisches Vorgehen (vom Einfachen zum Komplexen, vom Zubehör zum Gerät) spart Zeit und Punkte.</p>
            <div className="grid grid-2" style={{ gap: 8 }}>
              {actions.map((a) => {
                const isDone = done.includes(a.id);
                return (
                  <div key={a.id} className="card" style={{ padding: 12, borderColor: isDone ? (a.useful ? 'var(--ok)' : 'var(--warn)') : undefined }}>
                    <div className="row between" style={{ flexWrap: 'nowrap' }}>
                      <strong className="small" style={{ color: 'var(--navy-800)' }}>{a.label}</strong>
                      {!isDone && !finished && (
                        <button className="btn sm" onClick={() => setDone([...done, a.id])}>Ausführen ({a.minutes}′)</button>
                      )}
                    </div>
                    {isDone && (
                      <div className={`feedback ${a.useful ? 'ok' : ''}`} style={{ background: a.useful ? undefined : 'var(--warn-bg)', marginTop: 8 }}>
                        <span className="small"><strong>Befund:</strong> <Rich text={a.finding} /></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="section">
            <h2 className="mt-0">6 · Diagnose stellen</h2>
            {hypotheses.map((h) => {
              const wrong = wrongGuesses.includes(h.id);
              const right = finished && h.correct;
              return (
                <div key={h.id}>
                  <button className={`opt ${right ? 'right' : wrong ? 'wrong' : guess === h.id ? 'sel' : ''}`} disabled={finished || wrong} onClick={() => setGuess(h.id)}>
                    <Rich text={h.text} />
                  </button>
                  {(wrong || right) && <div className={`feedback ${right ? 'ok' : 'bad'}`} style={{ marginTop: -4, marginBottom: 10 }}><Rich text={h.feedback} /></div>}
                </div>
              );
            })}
            {!finished && (
              <button className="btn" disabled={!guess || wrongGuesses.includes(guess)} onClick={submit}>Diagnose bestätigen</button>
            )}
          </section>

          {finished && (
            <section className="section">
              <div className="card" style={{ borderColor: 'var(--ok)' }}>
                <div className="row between">
                  <h2 className="mt-0 mb-0">7 · Ergebnis</h2>
                  <span className="badge ok">{Math.round(score)} Punkte</span>
                </div>
                <RichParagraphs text={c.result} />
              </div>
              <h2>8 · Ausführliche Erklärung</h2>
              <RichParagraphs text={c.explanation} />
              <h2>9 · Wissenschaftlicher Hintergrund</h2>
              <RichParagraphs text={c.science} />
              <Callout variant="merke" title="Das nimmst du mit">
                <ul className="mb-0">{c.learnings.map((l, i) => <li key={i}><Rich text={l} /></li>)}</ul>
              </Callout>
              {c.relatedLessons && c.relatedLessons.length > 0 && (
                <>
                  <h3>Weiterlernen</h3>
                  <div className="row">
                    {c.relatedLessons.filter((l) => lessonIndex.has(l)).map((l) => <Link key={l} to={`/lektion/${l}`} className="btn secondary sm">{lessonIndex.get(l)!.lesson.title}</Link>)}
                  </div>
                </>
              )}
            </section>
          )}
        </div>
        <aside className="stack sticky">
          <div className="card">
            <div className="card-title">📋 Dein Vorgehen</div>
            <div className="kv mt-1">
              <div>Zeit</div><div>{minutes} min</div>
              <div>Zielführende Schritte</div><div>{usefulDone}</div>
              <div>Unnötige Schritte</div><div>{unnecessary}</div>
              <div>Fehldiagnosen</div><div>{wrongGuesses.length}</div>
            </div>
            <p className="tiny muted mt-1 mb-0">Punkte: 100 − 25 je Fehldiagnose − 5 je unnötigem Schritt − Zeitabzug über 30 min.</p>
          </div>
          <Callout variant="vereinfachung" title="Simulierte Lernumgebung">
            Der Fall ist didaktisch vereinfacht und an keinen realen Patienten und kein bestimmtes Herstellermodell gebunden. Reale
            Instandsetzung erfolgt ausschließlich nach Herstellervorgaben durch qualifiziertes Personal.
          </Callout>
        </aside>
      </div>
      {finished && <SourceList ids={c.sources} updated={c.updated} title="10 · Quellen & weiterführende Inhalte" />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Service-Management                                                  */
/* ------------------------------------------------------------------ */

export function ServiceManagementPage() {
  return (
    <div>
      <PageHead
        kicker="Virtuelles Service-Management"
        title="Einen Krankenhaus-Gerätepark betreuen"
        lead="Übernimm die medizintechnische Betreuung eines kleinen Gerätebestands: Geräte erfassen, Prüfungen planen, Störungen priorisieren, Ersatzteile disponieren und den Gerätestatus im Blick behalten."
      />
      <SimEmbed simId="service-management" standalone />
    </div>
  );
}
