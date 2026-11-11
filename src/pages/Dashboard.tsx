import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { categories, devices, modules, questionById, type PooledQuestion } from '../data/registry';
import {
  BADGES,
  completeDailyTask,
  dueQuestionIds,
  exportProgress,
  importProgress,
  levelFor,
  recordQuiz,
  resetProgress,
  today,
  update,
  useProgress,
} from '../lib/progress';
import { dailyTasks, knowledgeGaps, recommendations, topicLabel, topicStats, weekKey, weeklyTasks } from '../lib/tasks';
import { Empty, PageHead, ProgressBar } from '../components/ui/Common';
import { QuestionView } from '../components/ui/Quiz';
import { originHref } from '../lib/coach';
import { DifficultyPicker } from './Practice';

function Review() {
  const s = useProgress((x) => x);
  const due = useMemo(() => dueQuestionIds(s).map((id) => questionById.get(id)).filter((x): x is PooledQuestion => !!x).slice(0, 5), [s.questions]); // eslint-disable-line react-hooks/exhaustive-deps
  const [session, setSession] = useState<PooledQuestion[] | null>(null);
  const [i, setI] = useState(0);
  const results = useRef<Record<string, boolean>>({});
  if (!session) {
    return (
      <div className="card" id="wiederholen">
        <div className="row between">
          <div>
            <div className="card-title">🔁 Wiederholung (Leitner-System)</div>
            <p className="card-sub">Falsch beantwortete Fragen kommen sofort wieder, richtige in wachsenden Abständen (1, 3, 7, 16 Tage).</p>
          </div>
          <span className="badge navy">{dueQuestionIds(s).length} fällig</span>
        </div>
        {due.length === 0 ? <p className="small muted mt-1 mb-0">Aktuell ist nichts fällig. Beantworte Quizfragen in Lektionen und Geräteprofilen – sie landen dann hier.</p> : <button className="btn mt-1" onClick={() => { results.current = {}; setI(0); setSession(due); }}>{due.length} Fragen wiederholen</button>}
      </div>
    );
  }
  const q = session[i];
  return (
    <div className="quiz" id="wiederholen">
      <div className="quiz-head"><strong>🔁 Wiederholung</strong><span className="badge navy">{i + 1}/{session.length}</span></div>
      <QuestionView key={q.question.id} q={q.question} onAnswered={(c) => (results.current[q.question.id] = c)} />
      <div className="row between mt-1">
        <Link to={originHref(q)} className="small">Quelle: {q.origin.title}</Link>
        <button className="btn navy" onClick={() => {
          if (!(q.question.id in results.current)) return;
          if (i + 1 < session.length) setI(i + 1);
          else {
            recordQuiz(`review-${today()}`, 'Wiederholung', results.current);
            if (session.length >= 5 || Object.keys(results.current).length >= 5) completeDailyTask('wiederholung', 'Wiederholung: 5 Fragen', 15);
            setSession(null);
          }
        }}>{i + 1 < session.length ? 'Weiter →' : 'Abschließen'}</button>
      </div>
    </div>
  );
}

export function Dashboard() {
  const s = useProgress((x) => x);
  const lvl = levelFor(s.xp);
  const gaps = knowledgeGaps(s);
  const stats = topicStats(s).filter((t) => !t.topic.startsWith('kat-'));
  const recs = recommendations(s);
  const fileRef = useRef<HTMLInputElement>(null);
  const wk = weekKey();
  const totalLessons = modules.reduce((a, m) => a + m.lessons.length, 0);
  const quizCount = Object.keys(s.quizzes).length;
  const avgQuiz = quizCount ? Math.round(Object.values(s.quizzes).reduce((a, q) => a + q.best, 0) / quizCount) : 0;

  return (
    <div>
      <PageHead kicker="Persönliches Dashboard" title={s.displayName ? `Hallo, ${s.displayName}!` : 'Dein Lernfortschritt'} lead="Alles auf einen Blick: Level, Serien, Fortschritt pro Bereich und Gerätekategorie, Wissenslücken, Wiederholung und Lernhistorie." />

      <div className="grid grid-4">
        <div className="card kpi"><span className="v">⭐ {s.xp}</span><span className="l">XP · Level {lvl.level}: {lvl.title}</span><div className="mt-1"><ProgressBar value={lvl.progress} /></div></div>
        <div className="card kpi"><span className="v">🔥 {s.streak.current}</span><span className="l">Tage Lernserie (Rekord {s.streak.best})</span></div>
        <div className="card kpi"><span className="v">{Object.keys(s.completedLessons).length}/{totalLessons}</span><span className="l">Lektionen abgeschlossen</span></div>
        <div className="card kpi"><span className="v">{avgQuiz} %</span><span className="l">Ø Bestergebnis in {quizCount} Quizzen/Spielen</span></div>
      </div>

      <div className="grid grid-2 section">
        <Review />
        <div className="card">
          <div className="card-title">🎯 Empfehlungen</div>
          <div className="stack mt-1" style={{ gap: 8 }}>
            {recs.map((r, i) => (
              <Link key={i} to={r.href} className="row" style={{ flexWrap: 'nowrap', gap: 10 }}>
                <span style={{ fontSize: '1.3rem' }}>{r.icon}</span>
                <span><span style={{ fontWeight: 600, display: 'block' }}>{r.title}</span><span className="tiny muted">{r.reason}</span></span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-2 section">
        <div className="card">
          <div className="card-title">📅 Tagesaufgaben</div>
          {dailyTasks().map((t) => { const [a, b] = t.progress(s); return (
            <div key={t.id} className="mt-1">
              <div className="row between small"><Link to={t.href}>{a >= b ? '✅' : '⬜'} {t.title}</Link><span className="badge">+{t.xp} XP</span></div>
              <div className="tiny muted">{t.description}</div>
              {t.id === 'quiz' && a >= b && !s.dailyDone[today()]?.includes('quiz') && <button className="btn sm mt-1" onClick={() => completeDailyTask('quiz', t.title, t.xp)}>XP abholen</button>}
            </div>
          ); })}
        </div>
        <div className="card">
          <div className="card-title">🗓️ Wochenaufgaben</div>
          {weeklyTasks().map((t) => {
            const [a, b] = t.progress(s);
            const claimed = s.dailyDone[wk]?.includes(t.id);
            return (
              <div key={t.id} className="mt-1">
                <div className="row between small"><Link to={t.href}>{t.title}</Link><span>{a}/{b}</span></div>
                <ProgressBar value={a / b} />
                {a >= b && !claimed && <button className="btn sm mt-1" onClick={() => update((st) => { st.dailyDone[wk] = [...(st.dailyDone[wk] ?? []), t.id]; st.xp += t.xp; st.history.unshift({ at: Date.now(), kind: 'task', ref: t.id, title: t.title, xp: t.xp }); })}>+{t.xp} XP abholen</button>}
                {claimed && <span className="badge ok mt-1">✓ abgeholt</span>}
              </div>
            );
          })}
        </div>
      </div>

      <section className="section">
        <h2>Fortschritt nach Bereichen</h2>
        <div className="heat">
          {modules.map((m) => {
            const d = m.lessons.filter((l) => s.completedLessons[l.id]).length;
            return (
              <Link key={m.id} to={`/modul/${m.id}`} className="cell">
                <div className="small" style={{ fontWeight: 600 }}>{m.icon} {m.title}</div>
                <ProgressBar value={d / Math.max(1, m.lessons.length)} />
                <div className="tiny muted">{d}/{m.lessons.length}</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section">
        <h2>Fortschritt pro Gerätekategorie</h2>
        <div className="heat">
          {categories.map((c) => {
            const all = devices.filter((d) => d.category === c.id);
            const seen = all.filter((d) => s.visitedDevices[d.id]).length;
            const quizzed = all.filter((d) => (s.quizzes[`device:${d.id}`]?.best ?? 0) >= 80).length;
            return (
              <Link key={c.id} to={`/geraete?kategorie=${c.id}`} className="cell">
                <div className="small" style={{ fontWeight: 600 }}>{c.icon} {c.name}</div>
                <ProgressBar value={seen / Math.max(1, all.length)} />
                <div className="tiny muted">{seen}/{all.length} angesehen · {quizzed} Quiz ≥ 80 %</div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid grid-2 section">
        <div className="card">
          <div className="card-title">🩹 Erkannte Wissenslücken</div>
          {gaps.length === 0 ? <p className="small muted">Noch keine Lücken erkannt (ab 2 Antworten pro Thema und unter 70 % Trefferquote).</p> : (
            <div className="stack mt-1">{gaps.slice(0, 8).map((g) => (
              <div key={g.topic}><div className="row between small"><span>{topicLabel(g.topic)}</span><span>{Math.round(g.ratio * 100)} %</span></div><ProgressBar value={g.ratio} navy /></div>
            ))}</div>
          )}
          {stats.length > 0 && (
            <details className="mt-2"><summary className="small">Alle Wissensstatistiken ({stats.length} Themen)</summary>
              <div className="stack mt-1">{stats.map((g) => (<div key={g.topic}><div className="row between small"><span>{topicLabel(g.topic)}</span><span>{g.correct}✓ {g.wrong}✗</span></div><ProgressBar value={g.ratio} /></div>))}</div>
            </details>
          )}
        </div>
        <div className="card">
          <div className="card-title">🏅 Abzeichen ({Object.keys(s.badges).length}/{BADGES.length})</div>
          <div className="grid mt-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
            {BADGES.map((b) => (
              <div key={b.id} title={b.description} style={{ textAlign: 'center', padding: 8, borderRadius: 10, background: s.badges[b.id] ? 'var(--teal-50)' : 'var(--surface-2)', opacity: s.badges[b.id] ? 1 : 0.45 }}>
                <div style={{ fontSize: '1.6rem' }}>{b.icon}</div>
                <div className="tiny" style={{ fontWeight: 600 }}>{b.title}</div>
                <div className="tiny muted">{b.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="section card">
        <div className="row between">
          <div className="card-title">⚙️ Einstellungen</div>
          <DifficultyPicker />
        </div>
        <p className="small muted">Die Schwierigkeitsstufe steuert die Fragenauswahl in der Prüfungsakademie. Die Erklärungsebene (einfach/technisch/Experte) wählst du direkt in den Lektionen.</p>
        <div className="row">
          <button className="btn secondary sm" onClick={() => { const blob = new Blob([exportProgress()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'medtech-academy-fortschritt.json'; a.click(); }}>⬇️ Fortschritt exportieren</button>
          <button className="btn secondary sm" onClick={() => fileRef.current?.click()}>⬆️ Importieren</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) alert(importProgress(await f.text()) ? 'Fortschritt importiert.' : 'Datei ungültig.'); }} />
          <button className="btn ghost sm" style={{ color: 'var(--bad)' }} onClick={() => { if (confirm('Gesamten Lernfortschritt wirklich löschen?')) resetProgress(); }}>Fortschritt zurücksetzen</button>
        </div>
      </section>

      <section className="section">
        <h2>Lernhistorie</h2>
        {s.history.length === 0 ? <Empty>Noch keine Aktivitäten.</Empty> : (
          <div className="table-wrap"><table className="t"><thead><tr><th>Zeitpunkt</th><th>Aktivität</th><th>Details</th><th>XP</th></tr></thead><tbody>
            {s.history.slice(0, 40).map((h, i) => (
              <tr key={i}><td className="small">{new Date(h.at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</td><td>{h.title}</td><td className="small muted">{h.detail ?? h.kind}</td><td>{h.xp > 0 ? `+${h.xp}` : '🏅'}</td></tr>
            ))}
          </tbody></table></div>
        )}
      </section>
    </div>
  );
}
