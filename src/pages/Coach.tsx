import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ExplainLevel } from '../types/content';
import { askCoach, contextFor, type CoachAnswer } from '../lib/coach';
import { getState, useProgress } from '../lib/progress';
import { RichParagraphs } from '../lib/text';
import { Callout, LevelSwitch, PageHead, SourceList } from '../components/ui/Common';
import { Quiz } from '../components/ui/Quiz';

interface Msg {
  role: 'user' | 'bot';
  text?: string;
  answer?: CoachAnswer;
  llm?: { text: string; error?: string };
}

const EXAMPLES = ['Wie funktioniert ein Pulsoximeter?', 'Was ist PEEP?', 'Erkläre Ableitstrom', 'Quiz zu Defibrillation', 'Meine Wissenslücken', 'Erkläre meine Fehler'];

function AnswerView({ a }: { a: CoachAnswer }) {
  const level = useProgress((s) => s.explainLevel);
  return (
    <div>
      <div className="row between mb-2">
        <strong style={{ color: 'var(--navy-800)' }}>{a.title}</strong>
        {a.levels && <LevelSwitch />}
      </div>
      {a.levels && <RichParagraphs text={a.levels[level as ExplainLevel]} />}
      {a.text && <RichParagraphs text={a.text} />}
      {a.quiz && a.quiz.length > 0 && <Quiz quizKey={`coach:${a.quiz.map((q) => q.question.id).join('|').slice(0, 80)}`} title={a.title} questions={a.quiz.map((q) => q.question)} />}
      {a.links.length > 0 && (
        <div className="row mt-1" style={{ gap: 6 }}>
          {a.links.map((l, i) => <Link key={i} to={l.href} className="badge navy">→ {l.title}</Link>)}
        </div>
      )}
      <p className="tiny muted mt-1 mb-0">
        Grundlage: {a.basis} · Verlässlichkeit: <strong>{a.confidence}</strong>
      </p>
      {a.sources.length > 0 && <SourceList ids={a.sources} title="Quellen dieser Antwort" />}
    </div>
  );
}

export function CoachPage() {
  const [params] = useSearchParams();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [llmAvailable, setLlmAvailable] = useState(false);
  const [useLlm, setUseLlm] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const asked = useRef(false);

  useEffect(() => {
    fetch('/api/coach/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setLlmAvailable(!!j?.ok))
      .catch(() => setLlmAvailable(false));
  }, []);

  useEffect(() => {
    const q = params.get('q');
    if (q && !asked.current) {
      asked.current = true;
      ask(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs]);

  async function ask(q: string) {
    const answer = askCoach(q, getState());
    const next: Msg[] = [...msgs, { role: 'user', text: q }, { role: 'bot', answer }];
    setMsgs(next);
    if (useLlm && llmAvailable && (answer.kind === 'explain' || answer.kind === 'unknown')) {
      try {
        const r = await fetch('/api/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q, level: getState().explainLevel, context: contextFor(answer) }),
        });
        const j = await r.json();
        setMsgs([...next, { role: 'bot', llm: { text: j.text ?? '', error: j.error } }]);
      } catch {
        setMsgs([...next, { role: 'bot', llm: { text: '', error: 'Coach-Server nicht erreichbar.' } }]);
      }
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    ask(input.trim());
    setInput('');
  }

  return (
    <div className="content narrow" style={{ padding: 0 }}>
      <PageHead kicker="Dein persönlicher Medizintechnik-Tutor" title="🤖 KI-Lerncoach" lead="Frag nach Geräten, Begriffen und Prinzipien. Jede Erklärung gibt es auf drei Ebenen – einfach, technisch und für Expert:innen – mit Quellen. Außerdem: Quizze erstellen, Wissenslücken erkennen, Fehler analysieren." />
      <Callout variant="info" title="Wie der Coach arbeitet">
        Standardmäßig antwortet der Coach <strong>ausschließlich aus den geprüften Inhalten dieser Plattform</strong> (Lexikon, Geräteprofile,
        Lektionen, kuratierte Coach-Themen) und nennt die Quellen. Findet er nichts Belastbares, sagt er das offen, statt zu raten.
        {llmAvailable ? (
          <label className="row mt-1" style={{ gap: 8 }}>
            <input type="checkbox" checked={useLlm} onChange={(e) => setUseLlm(e.target.checked)} />
            Zusätzlich Sprachmodell-Antwort anfordern (Coach-Server aktiv; Antworten sind KI-generiert und als solche gekennzeichnet)
          </label>
        ) : (
          <span className="small"> Ein optionaler Sprachmodell-Modus ist verfügbar, wenn der lokale Coach-Server läuft (<code>npm run coach-server</code>, siehe README).</span>
        )}
      </Callout>
      <div className="chat mt-2">
        {msgs.length === 0 && (
          <div className="msg bot">
            <p>Hallo! Ich bin dein Lerncoach. Probier zum Beispiel:</p>
            <div className="row" style={{ gap: 6 }}>
              {EXAMPLES.map((e) => <button key={e} className="chip" onClick={() => ask(e)}>{e}</button>)}
            </div>
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="msg user">{m.text}</div>
          ) : m.answer ? (
            <div key={i} className="msg bot"><AnswerView a={m.answer} /></div>
          ) : (
            <div key={i} className="msg bot" style={{ borderColor: '#c4b5fd' }}>
              <span className="badge" style={{ background: '#f5f3ff', color: '#6d28d9' }}>KI-generiert · bitte mit Quellen abgleichen</span>
              {m.llm?.error ? <p className="small mt-1 mb-0">⚠️ {m.llm.error}</p> : <RichParagraphs text={m.llm?.text ?? ''} />}
            </div>
          ),
        )}
        <div ref={bottom} />
      </div>
      <form onSubmit={submit} className="row mt-2" style={{ position: 'sticky', bottom: 10, background: 'var(--bg)', padding: '8px 0' }}>
        <input className="input" style={{ flex: 1 }} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Deine Frage … (z. B. „Wie funktioniert eine Spritzenpumpe?“)" aria-label="Frage an den Coach" />
        <button className="btn">Fragen</button>
      </form>
    </div>
  );
}
