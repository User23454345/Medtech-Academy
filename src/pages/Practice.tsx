import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Game } from '../types/content';
import {
  categories,
  devices,
  examById,
  exams,
  learningPaths,
  modules,
  questionById,
  questionPool,
  type PooledQuestion,
} from '../data/registry';
import { getState, recordQuiz, setDisplayName, togglePath, useProgress, BADGES, levelFor } from '../lib/progress';
import { stepDone, stepHref, topicLabel } from '../lib/tasks';
import { Rich } from '../lib/text';
import { formatDate, hashString, shuffle } from '../lib/util';
import { GameView } from '../components/games/Games';
import { Callout, Empty, PageHead, ProgressBar } from '../components/ui/Common';
import { QuestionView } from '../components/ui/Quiz';
import { NotFound } from './Misc';

/* ---------------- Lernpfade ---------------- */

export function PathsPage() {
  const s = useProgress((x) => x);
  return (
    <div>
      <PageHead kicker="Lernpfade nach Kenntnisstand und Berufsziel" title="Wähle deinen Weg" lead="Lernpfade bündeln Lektionen, Geräte, Simulationen, Fälle und Prüfungen zu einer sinnvollen Reihenfolge. Du kannst mehrere Pfade gleichzeitig aktivieren und jederzeit wechseln." />
      {learningPaths.length === 0 && <Empty>Noch keine Lernpfade angelegt.</Empty>}
      <div className="stack">
        {learningPaths.map((p) => {
          const done = p.steps.filter((st) => stepDone(s, st.kind, st.ref)).length;
          const active = s.activePaths.includes(p.id);
          return (
            <details key={p.id} className="acc" open={active}>
              <summary>
                <span className="row" style={{ gap: 10 }}>
                  <span className="ico-lg">{p.icon}</span>
                  <span>
                    {p.title}
                    <span className="small muted" style={{ display: 'block', fontWeight: 400 }}>{p.audience} · {done}/{p.steps.length} Schritte</span>
                  </span>
                  {active && <span className="badge teal">aktiv</span>}
                </span>
              </summary>
              <div className="acc-body">
                <p>{p.description}</p>
                <div style={{ maxWidth: 420 }} className="mb-2"><ProgressBar value={done / Math.max(1, p.steps.length)} /></div>
                <button className={`btn ${active ? 'secondary' : ''} sm mb-2`} onClick={() => togglePath(p.id)}>{active ? 'Lernpfad deaktivieren' : 'Lernpfad aktivieren'}</button>
                <ol className="steps">
                  {p.steps.map((st, i) => {
                    const ok = stepDone(s, st.kind, st.ref);
                    return (
                      <li key={i}>
                        <Link to={stepHref(st.kind, st.ref)} className="st">{ok ? '✓ ' : ''}{st.title}</Link>
                        <div className="tiny muted">{({ lesson: 'Lektion', module: 'Modul', device: 'Gerät', sim: 'Simulation', case: 'Fall', exam: 'Prüfung', page: 'Bereich' } as Record<string, string>)[st.kind]}</div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Lernspiele ---------------- */

function deviceFieldGame(): Game {
  const picks = shuffle(devices).slice(0, 10);
  const cats = Array.from(new Set(picks.map((d) => d.category))).slice(0, 4);
  const items = picks.filter((d) => cats.includes(d.category)).slice(0, 8);
  return {
    kind: 'categorize',
    title: 'Geräte den Kategorien zuordnen',
    instructions: 'Ordne jedes Gerät seiner Gerätekategorie zu.',
    categories: cats.map((c) => categories.find((x) => x.id === c)!.name),
    items: items.map((d) => [d.name, cats.indexOf(d.category)] as [string, number]),
  };
}

function componentGame(): Game | null {
  const candidates = devices.filter((d) => d.components.length >= 4);
  if (candidates.length === 0) return null;
  const d = shuffle(candidates)[0];
  const comps = shuffle(d.components).slice(0, 5);
  return {
    kind: 'match',
    title: `Bauteile zuordnen: ${d.name}`,
    instructions: 'Ordne jedem Bauteil seine Funktion zu: erst links ein Bauteil wählen, dann rechts die passende Funktion.',
    pairs: comps.map((c) => [c.name, c.function.split(/(?<=\.)\s/)[0].slice(0, 140)] as [string, string]),
  };
}

function collectLessonGames(): { game: Game; origin: string }[] {
  const out: { game: Game; origin: string }[] = [];
  for (const m of modules) for (const l of m.lessons) for (const b of l.blocks) if (b.type === 'game') out.push({ game: b.game, origin: `${m.title} · ${l.title}` });
  return out;
}

function QuizDuel() {
  const [state, setState] = useState<'idle' | 'run' | 'end'>('idle');
  const [qs, setQs] = useState<PooledQuestion[]>([]);
  const [i, setI] = useState(0);
  const [mine, setMine] = useState(0);
  const [opp, setOpp] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [time, setTime] = useState(20);
  const timer = useRef<number | null>(null);
  const results = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (state !== 'run' || answered) return;
    timer.current = window.setInterval(() => setTime((t) => t - 1), 1000);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [state, answered, i]);

  useEffect(() => {
    if (state === 'run' && time <= 0 && !answered) onAnswer(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time]);

  function start() {
    const pool = questionPool.filter((p) => p.question.kind === 'single' || p.question.kind === 'truefalse');
    setQs(shuffle(pool).slice(0, 7));
    setI(0); setMine(0); setOpp(0); setTime(20); setAnswered(false); results.current = {};
    setState('run');
  }
  function onAnswer(correct: boolean) {
    if (answered) return;
    setAnswered(true);
    results.current[qs[i].question.id] = correct;
    if (correct) setMine((m) => m + 10 + Math.max(0, time));
    // simulierter Gegner: 65 % Trefferquote, deterministisch je Frage
    const oppCorrect = hashString(qs[i].question.id + i) % 100 < 65;
    if (oppCorrect) setOpp((o) => o + 10 + (hashString(qs[i].question.id) % 12));
  }
  function next() {
    if (i + 1 >= qs.length) {
      recordQuiz('quizduell', 'Quizduell', results.current);
      setState('end');
    } else {
      setI(i + 1); setTime(20); setAnswered(false);
    }
  }

  if (state === 'idle')
    return (
      <div>
        <p className="small">7 zufällige Fragen aus der ganzen Plattform, 20 Sekunden pro Frage. Schnelle richtige Antworten bringen Bonuspunkte. Dein Gegner „MT-Bot“ ist ein simulierter Mitspieler mit ca. 65 % Trefferquote.</p>
        <button className="btn" onClick={start} disabled={questionPool.length < 7}>Duell starten</button>
      </div>
    );
  if (state === 'end')
    return (
      <div>
        <div className="row" style={{ gap: 30 }}>
          <div className="kpi"><span className="v">{mine}</span><span className="l">Du</span></div>
          <div className="kpi"><span className="v">{opp}</span><span className="l">MT-Bot</span></div>
        </div>
        <div className={`feedback ${mine >= opp ? 'ok' : 'bad'}`}>{mine > opp ? '🏆 Gewonnen!' : mine === opp ? '🤝 Unentschieden' : 'Knapp verloren – Revanche?'}</div>
        <button className="btn mt-1" onClick={start}>Revanche</button>
      </div>
    );
  const q = qs[i];
  return (
    <div>
      <div className="row between mb-2">
        <span className="badge navy">Frage {i + 1}/{qs.length}</span>
        <span className="row"><span className="badge teal">Du: {mine}</span><span className="badge">MT-Bot: {opp}</span><span className={`badge ${time <= 5 ? 'bad' : 'warn'}`}>⏱ {Math.max(0, time)} s</span></span>
      </div>
      <QuestionView key={q.question.id} q={q.question} onAnswered={onAnswer} revealed={answered && time <= 0 ? true : undefined} />
      {answered && <button className="btn navy mt-1" onClick={next}>{i + 1 >= qs.length ? 'Ergebnis' : 'Weiter →'}</button>}
    </div>
  );
}

export function GamesPage() {
  const [seed, setSeed] = useState(0);
  const devGame = useMemo(() => deviceFieldGame(), [seed]);
  const compGame = useMemo(() => componentGame(), [seed]);
  const lessonGames = useMemo(() => collectLessonGames(), []);
  return (
    <div>
      <PageHead kicker="Gamification" title="Lernspiele" lead="Spielerisch üben – mit fachlich geprüften Inhalten. Jedes Spiel bringt XP und zählt für deine Statistik." />
      <div className="grid grid-2">
        <div className="quiz" style={{ margin: 0 }}>
          <div className="quiz-head"><strong>⚔️ Quizduell</strong><span className="badge teal">Zeitdruck</span></div>
          <QuizDuel />
        </div>
        <div>
          <GameView key={`d${seed}`} game={devGame} />
        </div>
      </div>
      {compGame && <GameView key={`c${seed}`} game={compGame} />}
      <button className="btn secondary" onClick={() => setSeed(seed + 1)}>🎲 Neue Zufallsrunde</button>
      {lessonGames.length > 0 && (
        <section className="section">
          <h2>Spiele aus den Lernmodulen ({lessonGames.length})</h2>
          {lessonGames.map((g, i) => (
            <div key={i}>
              <p className="tiny muted mb-0">{g.origin}</p>
              <GameView game={g.game} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

/* ---------------- Prüfungsakademie ---------------- */

function examQuestions(examId: string): PooledQuestion[] {
  const e = examById.get(examId)!;
  const own = (e.questions ?? []).map((q) => questionById.get(q.id)!).filter(Boolean);
  const fromTopics = questionPool.filter((p) => !own.includes(p) && p.topics.some((t) => e.topics.includes(t)));
  const pool = [...own, ...fromTopics];
  const difficulty = getState().difficulty;
  // Schwierigkeitsstufe: passende Fragen bevorzugen
  const weighted = pool.slice().sort((a, b) => Math.abs((a.question.difficulty ?? 2) - difficulty) - Math.abs((b.question.difficulty ?? 2) - difficulty));
  const preferred = weighted.slice(0, Math.max(e.questionCount * 2, e.questionCount));
  return shuffle(preferred).slice(0, e.questionCount);
}

export function ExamsPage() {
  const ex = useProgress((s) => s.exams);
  const diff = useProgress((s) => s.difficulty);
  return (
    <div>
      <PageHead kicker="Prüfungsvorbereitung" title="Prüfungsakademie" lead="Teste dein Wissen unter Prüfungsbedingungen: Multiple Choice, Rechenaufgaben, Zuordnungen und fallbasierte Fragen. Nach jeder Prüfung erhältst du Auswertung, Erklärungen, Wissenslücken und Wiederholungsempfehlungen." />
      <div className="card mb-2 row between">
        <div><strong>Individuelle Schwierigkeitsstufe:</strong> <span className="muted small">Prüfungen bevorzugen Fragen deiner Stufe.</span></div>
        <DifficultyPicker />
      </div>
      <div className="grid grid-3">
        {exams.map((e) => {
          const r = ex[e.id];
          const available = new Set([...(e.questions ?? []).map((q) => q.id), ...questionPool.filter((p) => p.topics.some((t) => e.topics.includes(t))).map((p) => p.question.id)]).size;
          return (
            <Link key={e.id} to={`/akademie/${e.id}`} className="card hover">
              <div className="row between"><span className="ico-lg">{e.icon}</span>{r?.passed ? <span className="badge ok">✓ bestanden ({r.best} %)</span> : r ? <span className="badge warn">bestes: {r.best} %</span> : null}</div>
              <div className="card-title mt-1">{e.title}</div>
              <p className="card-sub">{e.description}</p>
              <div className="row mt-1" style={{ gap: 6 }}>
                <span className="badge navy">{e.questionCount} Fragen</span>
                <span className="badge">Bestehen ab {e.passPercent} %</span>
                <span className="badge">Pool: {available}</span>
              </div>
            </Link>
          );
        })}
      </div>
      {exams.length === 0 && <Empty>Noch keine Prüfungen angelegt.</Empty>}
      <p className="tiny muted mt-2">Stufe aktuell: {diff === 1 ? 'Einsteiger' : diff === 2 ? 'Fortgeschritten' : 'Experte'}</p>
    </div>
  );
}

export function DifficultyPicker() {
  const d = useProgress((s) => s.difficulty);
  return (
    <div className="segment">
      {([1, 2, 3] as const).map((x) => (
        <button key={x} className={d === x ? 'active' : ''} onClick={() => import('../lib/progress').then((m) => m.setDifficulty(x))}>
          {x === 1 ? 'Einsteiger' : x === 2 ? 'Fortgeschritten' : 'Experte'}
        </button>
      ))}
    </div>
  );
}

export function ExamPage() {
  const { id } = useParams();
  const e = id ? examById.get(id) : undefined;
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<'intro' | 'run' | 'result'>('intro');
  const [qs, setQs] = useState<PooledQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [percent, setPercent] = useState(0);
  if (!e) return <NotFound />;

  function start() {
    setQs(examQuestions(e!.id));
    setIdx(0);
    setResults({});
    setPhase('run');
    setRun(run + 1);
  }
  function finish() {
    const p = recordQuiz(e!.id, e!.title, results, 'exam', e!.passPercent);
    setPercent(p);
    setPhase('result');
  }

  if (phase === 'intro')
    return (
      <div className="content narrow" style={{ padding: 0 }}>
        <PageHead kicker="Prüfungsakademie" title={`${e.icon} ${e.title}`} lead={e.description} crumbs={[['Prüfungsakademie', '/akademie'], [e.title]]} />
        <div className="card">
          <ul>
            <li>{e.questionCount} Fragen aus den Themen: {e.topics.map(topicLabel).join(', ')}</li>
            <li>Bestanden ab {e.passPercent} %</li>
            <li>Feedback zu jeder Frage direkt nach der Antwort; Gesamtauswertung am Ende</li>
          </ul>
          <button className="btn" onClick={start}>Prüfung starten</button>
        </div>
      </div>
    );

  if (phase === 'run') {
    const q = qs[idx];
    if (!q) return <Empty>Für diese Prüfung sind noch nicht genug Fragen vorhanden.</Empty>;
    return (
      <div className="content narrow" style={{ padding: 0 }}>
        <div className="row between mb-2"><strong>{e.title}</strong><span className="badge navy">Frage {idx + 1}/{qs.length}</span></div>
        <ProgressBar value={idx / qs.length} />
        <div className="quiz">
          <p className="tiny muted mt-0">Thema: {q.topics.filter((t) => !t.startsWith('kat-')).map(topicLabel).slice(0, 3).join(' · ')}</p>
          <QuestionView key={q.question.id + run} q={q.question} onAnswered={(c) => setResults({ ...results, [q.question.id]: c })} />
          {q.question.id in results && (
            <div className="row mt-2" style={{ justifyContent: 'flex-end' }}>
              {idx + 1 < qs.length ? <button className="btn navy" onClick={() => setIdx(idx + 1)}>Weiter →</button> : <button className="btn navy" onClick={finish}>Prüfung abgeben</button>}
            </div>
          )}
        </div>
      </div>
    );
  }

  const wrong = qs.filter((q) => !results[q.question.id]);
  const byTopic = new Map<string, { c: number; n: number }>();
  for (const q of qs) for (const t of q.topics.filter((x) => !x.startsWith('kat-'))) {
    const v = byTopic.get(t) ?? { c: 0, n: 0 };
    v.n++;
    if (results[q.question.id]) v.c++;
    byTopic.set(t, v);
  }
  const passed = percent >= e.passPercent;
  return (
    <div className="content narrow" style={{ padding: 0 }}>
      <PageHead kicker="Auswertung" title={passed ? '🎉 Bestanden!' : 'Noch nicht bestanden'} crumbs={[['Prüfungsakademie', '/akademie'], [e.title]]} />
      <div className="card row" style={{ gap: 40 }}>
        <div className="kpi"><span className="v">{percent} %</span><span className="l">Ergebnis (Bestehen ab {e.passPercent} %)</span></div>
        <div className="kpi"><span className="v">{qs.length - wrong.length}/{qs.length}</span><span className="l">richtige Antworten</span></div>
      </div>
      <h3>Ergebnis nach Themen</h3>
      <div className="stack">
        {Array.from(byTopic.entries()).sort((a, b) => a[1].c / a[1].n - b[1].c / b[1].n).map(([t, v]) => (
          <div key={t}>
            <div className="row between small"><span>{topicLabel(t)}</span><span>{v.c}/{v.n}</span></div>
            <ProgressBar value={v.c / v.n} />
          </div>
        ))}
      </div>
      {wrong.length > 0 && (
        <>
          <h3>Falsch beantwortet – hier wiederholen</h3>
          {wrong.map((q) => (
            <div key={q.question.id} className="card mb-2">
              <p className="mb-0"><strong><Rich text={q.question.prompt} /></strong></p>
              <p className="small"><Rich text={q.question.explanation} /></p>
              <Link className="small" to={q.origin.kind === 'device' ? `/geraete/${q.origin.ref}` : q.origin.kind === 'lesson' ? `/lektion/${q.origin.ref}` : q.origin.kind === 'equipment' ? `/messmittel/${q.origin.ref}` : q.origin.kind === 'hospital' ? `/krankenhaus/${q.origin.ref}` : '/akademie'}>→ Wiederholen: {q.origin.title}</Link>
            </div>
          ))}
        </>
      )}
      <div className="row mt-2">
        <button className="btn" onClick={start}>Neuer Durchgang</button>
        {passed && <Link to="/zertifikate" className="btn secondary">Zertifikat ansehen</Link>}
      </div>
    </div>
  );
}

/* ---------------- Zertifikate ---------------- */

export function CertificatesPage() {
  const s = useProgress((x) => x);
  const [name, setName] = useState(s.displayName);
  const passed = exams.filter((e) => s.exams[e.id]?.passed);
  const [sel, setSel] = useState<string>('fortschritt');
  const lvl = levelFor(s.xp);
  const chosenExam = examById.get(sel);
  return (
    <div>
      <PageHead kicker="Lernnachweise" title="Zertifikate" lead="Digitale Teilnahme- und Lernfortschrittszertifikate zum Ausdrucken oder Speichern als PDF (Drucken → Als PDF speichern)." />
      <Callout variant="warnung" title="Wichtiger Hinweis zur Anerkennung">
        Plattformintern erworbene Zertifikate sind <strong>keine</strong> staatlich anerkannten Berufsabschlüsse, <strong>keine</strong>
        behördlichen Befähigungsnachweise und stellen <strong>keine</strong> Qualifikation zur Durchführung gesetzlich geregelter Prüfungen
        (z. B. STK oder MTK nach MPBetreibV) dar. Sie dokumentieren ausschließlich die Teilnahme und den Lernfortschritt auf dieser Plattform.
      </Callout>
      <div className="row no-print mb-2">
        <input className="input" style={{ maxWidth: 300 }} value={name} placeholder="Dein Name für das Zertifikat" onChange={(e) => setName(e.target.value)} onBlur={() => setDisplayName(name)} aria-label="Name" />
        <select className="input" style={{ maxWidth: 320 }} value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Zertifikat wählen">
          <option value="fortschritt">Lernfortschrittszertifikat</option>
          {passed.map((e) => <option key={e.id} value={e.id}>Prüfung: {e.title}</option>)}
        </select>
        <button className="btn" onClick={() => { setDisplayName(name); window.print(); }}>🖨️ Drucken / PDF</button>
      </div>
      <div className="certificate">
        <div className="kicker">MedTech Academy</div>
        <h1>{chosenExam ? 'Teilnahmebescheinigung' : 'Lernfortschrittszertifikat'}</h1>
        <p>Hiermit wird bestätigt, dass</p>
        <h2 style={{ fontFamily: 'Georgia, serif', marginTop: 0 }}>{name || '— Name eintragen —'}</h2>
        {chosenExam ? (
          <p>die plattforminterne Lernerfolgskontrolle <strong>„{chosenExam.title}“</strong> mit <strong>{s.exams[chosenExam.id]?.best} %</strong> erfolgreich abgeschlossen hat.</p>
        ) : (
          <p>
            auf der Lernplattform MedTech Academy <strong>{Object.keys(s.completedLessons).length} Lektionen</strong> abgeschlossen,{' '}
            <strong>{Object.keys(s.visitedDevices).length} Geräteprofile</strong> bearbeitet, <strong>{Object.keys(s.solvedCases).length} technische Fälle</strong> gelöst
            und <strong>{s.xp} XP</strong> (Level {lvl.level} – {lvl.title}) erreicht hat.
          </p>
        )}
        <p className="small muted">Ausgestellt am {formatDate(new Date().toISOString().slice(0, 10))} · {Object.keys(s.badges).length} von {BADGES.length} Abzeichen</p>
        <p className="tiny muted" style={{ maxWidth: 620, margin: '20px auto 0' }}>
          Dieses Dokument ist kein staatlich anerkannter Abschluss, kein behördlicher Befähigungsnachweis und keine Qualifikation zur
          Durchführung gesetzlich geregelter Prüfungen. Es bescheinigt ausschließlich Lernaktivitäten auf der Plattform. Die Angaben
          beruhen auf lokal im Browser gespeicherten Daten und sind nicht fälschungssicher.
        </p>
      </div>
    </div>
  );
}

