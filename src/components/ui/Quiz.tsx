import { useMemo, useState } from 'react';
import type { Question } from '../../types/content';
import { recordQuiz } from '../../lib/progress';
import { Rich } from '../../lib/text';
import { shuffle } from '../../lib/util';

/* ------------------------------------------------------------------ */
/* Bewertung                                                           */
/* ------------------------------------------------------------------ */

export type Answer =
  | { kind: 'single'; value: number }
  | { kind: 'multi'; value: number[] }
  | { kind: 'truefalse'; value: boolean }
  | { kind: 'numeric'; value: number }
  | { kind: 'order'; value: string[] }
  | { kind: 'match'; value: Record<string, string> };

export function isCorrect(q: Question, a: Answer | undefined): boolean {
  if (!a) return false;
  switch (q.kind) {
    case 'single':
      return a.kind === 'single' && a.value === q.answer;
    case 'multi':
      return (
        a.kind === 'multi' &&
        a.value.length === q.answers.length &&
        q.answers.every((x) => a.value.includes(x))
      );
    case 'truefalse':
      return a.kind === 'truefalse' && a.value === q.answer;
    case 'numeric':
      return a.kind === 'numeric' && Number.isFinite(a.value) && Math.abs(a.value - q.answer) <= q.tolerance;
    case 'order':
      return a.kind === 'order' && a.value.every((v, i) => v === q.items[i]);
    case 'match':
      return a.kind === 'match' && q.pairs.every(([l, r]) => a.value[l] === r);
  }
}

/* ------------------------------------------------------------------ */
/* Einzelne Frage                                                      */
/* ------------------------------------------------------------------ */

const KEYS = 'ABCDEFGH';

export function QuestionView({
  q,
  onAnswered,
  revealed,
}: {
  q: Question;
  onAnswered: (correct: boolean) => void;
  /** von außen gesteuert (z. B. Prüfungsmodus ohne Sofort-Feedback) */
  revealed?: boolean;
}) {
  const [answer, setAnswer] = useState<Answer | undefined>();
  const [checked, setChecked] = useState(false);
  const shuffledRight = useMemo(() => (q.kind === 'match' ? shuffle(q.pairs.map((p) => p[1])) : []), [q]);
  const [order, setOrder] = useState<string[]>(() => (q.kind === 'order' ? shuffleUntilDifferent(q.items) : []));
  const [numInput, setNumInput] = useState('');
  const [match, setMatch] = useState<Record<string, string>>({});

  const show = checked || revealed;
  const correct = isCorrect(q, currentAnswer());

  function currentAnswer(): Answer | undefined {
    if (q.kind === 'order') return { kind: 'order', value: order };
    if (q.kind === 'numeric') return numInput.trim() === '' ? undefined : { kind: 'numeric', value: parseFloat(numInput.replace(',', '.')) };
    if (q.kind === 'match') return { kind: 'match', value: match };
    return answer;
  }

  function canCheck(): boolean {
    if (q.kind === 'order') return true;
    if (q.kind === 'numeric') return numInput.trim() !== '';
    if (q.kind === 'match') return Object.keys(match).length === q.pairs.length;
    if (q.kind === 'multi') return answer?.kind === 'multi' && answer.value.length > 0;
    return answer !== undefined;
  }

  function check() {
    setChecked(true);
    onAnswered(isCorrect(q, currentAnswer()));
  }

  function optClass(i: number): string {
    const selected =
      (answer?.kind === 'single' && answer.value === i) || (answer?.kind === 'multi' && answer.value.includes(i));
    if (!show) return selected ? 'opt sel' : 'opt';
    const isRight = q.kind === 'single' ? q.answer === i : q.kind === 'multi' ? q.answers.includes(i) : false;
    if (isRight) return 'opt right';
    if (selected) return 'opt wrong';
    return 'opt';
  }

  return (
    <div>
      <div className="quiz-q">
        <Rich text={q.prompt} />
      </div>

      {(q.kind === 'single' || q.kind === 'multi') && (
        <div>
          {q.kind === 'multi' && <p className="small muted mt-0">Mehrere Antworten können richtig sein.</p>}
          {q.options.map((o, i) => (
            <button
              key={i}
              className={optClass(i)}
              disabled={show}
              onClick={() => {
                if (q.kind === 'single') setAnswer({ kind: 'single', value: i });
                else {
                  const cur = answer?.kind === 'multi' ? answer.value : [];
                  setAnswer({ kind: 'multi', value: cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i] });
                }
              }}
            >
              <span className="key">{KEYS[i]}</span>
              <span>
                <Rich text={o} />
              </span>
            </button>
          ))}
        </div>
      )}

      {q.kind === 'truefalse' && (
        <div className="row">
          {[true, false].map((v) => {
            const sel = answer?.kind === 'truefalse' && answer.value === v;
            let cls = sel ? 'opt sel' : 'opt';
            if (show) cls = q.answer === v ? 'opt right' : sel ? 'opt wrong' : 'opt';
            return (
              <button key={String(v)} className={cls} style={{ width: 'auto', flex: 1 }} disabled={show} onClick={() => setAnswer({ kind: 'truefalse', value: v })}>
                <span className="key">{v ? '✓' : '✗'}</span>
                {v ? 'Richtig' : 'Falsch'}
              </button>
            );
          })}
        </div>
      )}

      {q.kind === 'numeric' && (
        <div className="row">
          <input
            className="input"
            style={{ maxWidth: 200 }}
            inputMode="decimal"
            value={numInput}
            disabled={show}
            onChange={(e) => setNumInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canCheck() && !show && check()}
            placeholder="Zahl eingeben"
            aria-label="Antwort"
          />
          <strong>{q.unit}</strong>
          {show && (
            <span className="badge navy">
              Lösung: {q.answer.toLocaleString('de-DE')} {q.unit} (± {q.tolerance.toLocaleString('de-DE')})
            </span>
          )}
        </div>
      )}

      {q.kind === 'order' && (
        <div>
          <p className="small muted mt-0">Bringe die Schritte mit den Pfeilen in die richtige Reihenfolge.</p>
          {order.map((item, i) => (
            <div key={item} className={`order-item ${show ? (q.items[i] === item ? 'right-b' : 'wrong-b') : ''}`}>
              <span className="num">{i + 1}</span>
              <span className="grow">
                <Rich text={item} />
              </span>
              {!show && (
                <>
                  <button className="icon-btn" aria-label="nach oben" disabled={i === 0} onClick={() => setOrder(move(order, i, i - 1))}>
                    ↑
                  </button>
                  <button className="icon-btn" aria-label="nach unten" disabled={i === order.length - 1} onClick={() => setOrder(move(order, i, i + 1))}>
                    ↓
                  </button>
                </>
              )}
            </div>
          ))}
          {show && !correct && (
            <p className="small mt-1">
              <strong>Richtige Reihenfolge:</strong> {q.items.map((it, i) => `${i + 1}. ${it}`).join(' → ')}
            </p>
          )}
        </div>
      )}

      {q.kind === 'match' && (
        <div className="stack" style={{ gap: 6 }}>
          {q.pairs.map(([l, r]) => (
            <div key={l} className={`match-item ${show ? (match[l] === r ? 'right-b' : 'wrong-b') : ''}`} style={{ flexWrap: 'wrap' }}>
              <span style={{ flex: '1 1 200px', fontWeight: 600 }}>
                <Rich text={l} />
              </span>
              <select
                className="input"
                style={{ flex: '1 1 220px', maxWidth: 360 }}
                value={match[l] ?? ''}
                disabled={show}
                onChange={(e) => setMatch({ ...match, [l]: e.target.value })}
                aria-label={`Zuordnung für ${l}`}
              >
                <option value="">– bitte wählen –</option>
                {shuffledRight.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {show && match[l] !== r && <span className="small">→ richtig: {r}</span>}
            </div>
          ))}
        </div>
      )}

      {!show && (
        <div className="row mt-2">
          <button className="btn" disabled={!canCheck()} onClick={check}>
            Antwort prüfen
          </button>
        </div>
      )}

      {show && (
        <div className={`feedback ${correct ? 'ok' : 'bad'}`}>
          <p>
            <strong>{correct ? '✓ Richtig!' : '✗ Leider nicht richtig.'}</strong>{' '}
            {!correct && q.kind === 'single' && answer?.kind === 'single' && q.optionFeedback?.[answer.value] && (
              <Rich text={q.optionFeedback[answer.value]} />
            )}
          </p>
          <p>
            <Rich text={q.explanation} />
          </p>
        </div>
      )}
    </div>
  );
}

function move<T>(arr: T[], from: number, to: number): T[] {
  const a = arr.slice();
  const [x] = a.splice(from, 1);
  a.splice(to, 0, x);
  return a;
}

function shuffleUntilDifferent(items: string[]): string[] {
  if (items.length < 2) return items.slice();
  for (let i = 0; i < 8; i++) {
    const s = shuffle(items);
    if (s.some((v, idx) => v !== items[idx])) return s;
  }
  return items.slice().reverse();
}

/* ------------------------------------------------------------------ */
/* Quiz (Folge von Fragen)                                             */
/* ------------------------------------------------------------------ */

export function Quiz({
  quizKey,
  title,
  questions,
  onFinished,
}: {
  quizKey: string;
  title?: string;
  questions: Question[];
  onFinished?: (percent: number, results: Record<string, boolean>) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0);
  const [percent, setPercent] = useState(0);

  if (questions.length === 0) return null;
  const q = questions[idx];
  const answered = q.id in results;

  function finish(final: Record<string, boolean>) {
    const p = recordQuiz(quizKey, title ?? 'Quiz', final);
    setPercent(p);
    setDone(true);
    onFinished?.(p, final);
  }

  if (done) {
    const correct = Object.values(results).filter(Boolean).length;
    const wrongIds = questions.filter((qq) => !results[qq.id]);
    return (
      <div className="quiz">
        <div className="quiz-head">
          <strong>{title ?? 'Wissenstest'}</strong>
          <span className={`badge ${percent >= 80 ? 'ok' : percent >= 50 ? 'warn' : 'bad'}`}>{percent} %</span>
        </div>
        <p>
          Du hast <strong>{correct}</strong> von <strong>{questions.length}</strong> Fragen richtig beantwortet.
        </p>
        <div className="progress mb-2">
          <div style={{ width: `${percent}%` }} />
        </div>
        {wrongIds.length > 0 && (
          <div className="callout info">
            <div className="callout-title">Zum Wiederholen</div>
            <ul className="mb-0">
              {wrongIds.map((w) => (
                <li key={w.id}>
                  <Rich text={w.prompt} />
                </li>
              ))}
            </ul>
            <p className="small mt-1 mb-0">Falsch beantwortete Fragen landen automatisch in deiner Wiederholungsliste im Dashboard.</p>
          </div>
        )}
        <button
          className="btn secondary"
          onClick={() => {
            setIdx(0);
            setResults({});
            setDone(false);
            setRound(round + 1);
          }}
        >
          Nochmal versuchen
        </button>
      </div>
    );
  }

  return (
    <div className="quiz">
      <div className="quiz-head">
        <strong>📝 {title ?? 'Wissenstest'}</strong>
        <span className="badge navy">
          Frage {idx + 1} / {questions.length}
        </span>
      </div>
      <div className="progress mb-2" style={{ height: 5 }}>
        <div style={{ width: `${(idx / questions.length) * 100}%` }} />
      </div>
      <QuestionView key={`${round}-${q.id}`} q={q} onAnswered={(c) => setResults({ ...results, [q.id]: c })} />
      {answered && (
        <div className="row mt-2" style={{ justifyContent: 'flex-end' }}>
          {idx < questions.length - 1 ? (
            <button className="btn navy" onClick={() => setIdx(idx + 1)}>
              Nächste Frage →
            </button>
          ) : (
            <button className="btn navy" onClick={() => finish(results)}>
              Auswertung anzeigen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
