import { useMemo, useState } from 'react';
import type { Game } from '../../types/content';
import { recordGame } from '../../lib/progress';
import { Rich } from '../../lib/text';
import { hashString, shuffle } from '../../lib/util';

/** Zuordnungsspiel: links anklicken, dann rechts anklicken */
function MatchGame({ game }: { game: Extract<Game, { kind: 'match' }> }) {
  const [round, setRound] = useState(0);
  const right = useMemo(() => shuffle(game.pairs.map((p) => p[1])), [game, round]);
  const left = useMemo(() => shuffle(game.pairs.map((p) => p[0])), [game, round]);
  const [selLeft, setSelLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [mistakes, setMistakes] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const done = Object.keys(matched).length === game.pairs.length;
  const correctOf = (l: string) => game.pairs.find((p) => p[0] === l)![1];

  function pickRight(r: string) {
    if (!selLeft) return;
    if (correctOf(selLeft) === r) {
      const next = { ...matched, [selLeft]: r };
      setMatched(next);
      setSelLeft(null);
      if (Object.keys(next).length === game.pairs.length) {
        const pct = Math.max(0, Math.round(100 - (mistakes / game.pairs.length) * 50));
        recordGame(`match-${hashString(game.title)}`, game.title, pct);
      }
    } else {
      setMistakes(mistakes + 1);
      setFlash(r);
      setTimeout(() => setFlash(null), 500);
    }
  }

  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="stack" style={{ gap: 6 }}>
          {left.map((l) => (
            <button key={l} className={`opt ${matched[l] ? 'right' : selLeft === l ? 'sel' : ''}`} disabled={!!matched[l]} onClick={() => setSelLeft(l)}>
              <Rich text={l} />
            </button>
          ))}
        </div>
        <div className="stack" style={{ gap: 6 }}>
          {right.map((r) => {
            const used = Object.values(matched).includes(r);
            return (
              <button key={r} className={`opt ${used ? 'right' : flash === r ? 'wrong' : ''}`} disabled={used || !selLeft} onClick={() => pickRight(r)}>
                <Rich text={r} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="row between mt-1">
        <span className="small muted">Fehlversuche: {mistakes}</span>
        {done && (
          <button className="btn sm secondary" onClick={() => { setMatched({}); setMistakes(0); setRound(round + 1); }}>
            Neu starten
          </button>
        )}
      </div>
      {done && <div className="feedback ok">🎉 Alle Paare richtig zugeordnet!</div>}
    </div>
  );
}

/** Reihenfolge-Spiel */
function OrderGame({ game }: { game: Extract<Game, { kind: 'order' }> }) {
  const init = () => {
    let s = shuffle(game.items);
    if (s.every((v, i) => v === game.items[i])) s = s.slice().reverse();
    return s;
  };
  const [items, setItems] = useState<string[]>(init);
  const [checked, setChecked] = useState(false);
  const correctCount = items.filter((v, i) => v === game.items[i]).length;
  function mv(i: number, d: number) {
    const a = items.slice();
    [a[i], a[i + d]] = [a[i + d], a[i]];
    setItems(a);
  }
  return (
    <div>
      {items.map((it, i) => (
        <div key={it} className={`order-item ${checked ? (game.items[i] === it ? 'right-b' : 'wrong-b') : ''}`}>
          <span className="num">{i + 1}</span>
          <span className="grow"><Rich text={it} /></span>
          <button className="icon-btn" aria-label="nach oben" disabled={i === 0 || checked} onClick={() => mv(i, -1)}>↑</button>
          <button className="icon-btn" aria-label="nach unten" disabled={i === items.length - 1 || checked} onClick={() => mv(i, 1)}>↓</button>
        </div>
      ))}
      <div className="row mt-1">
        {!checked ? (
          <button className="btn" onClick={() => { setChecked(true); recordGame(`order-${hashString(game.title)}`, game.title, Math.round((correctCount / items.length) * 100)); }}>
            Reihenfolge prüfen
          </button>
        ) : (
          <>
            <span className={`badge ${correctCount === items.length ? 'ok' : 'warn'}`}>{correctCount}/{items.length} an der richtigen Position</span>
            <button className="btn sm secondary" onClick={() => { setItems(init()); setChecked(false); }}>Nochmal</button>
          </>
        )}
      </div>
      {checked && correctCount < items.length && (
        <div className="feedback bad">
          <strong>Richtige Reihenfolge:</strong>
          <ol className="mb-0">{game.items.map((it) => <li key={it}><Rich text={it} /></li>)}</ol>
        </div>
      )}
    </div>
  );
}

/** Kategorisieren: Element wählen, dann Kategorie anklicken */
function CategorizeGame({ game }: { game: Extract<Game, { kind: 'categorize' }> }) {
  const [round, setRound] = useState(0);
  const pool = useMemo(() => shuffle(game.items.map((i) => i[0])), [game, round]);
  const [placed, setPlaced] = useState<Record<string, number>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const correctOf = (name: string) => game.items.find((i) => i[0] === name)![1];
  const remaining = pool.filter((p) => !(p in placed));
  const score = Object.entries(placed).filter(([n, c]) => correctOf(n) === c).length;
  return (
    <div>
      <div className="dropzone" style={{ marginBottom: 12, minHeight: 50 }} aria-label="Noch nicht zugeordnet">
        {remaining.length === 0 ? (
          <span className="small muted">Alle Elemente zugeordnet.</span>
        ) : (
          remaining.map((p) => (
            <span key={p} role="button" tabIndex={0} className={`token ${sel === p ? 'sel' : ''}`} onClick={() => setSel(p)} onKeyDown={(e) => e.key === 'Enter' && setSel(p)}>
              {p}
            </span>
          ))
        )}
      </div>
      <div className="grid grid-3">
        {game.categories.map((c, ci) => (
          <div key={c}>
            <div className="small" style={{ fontWeight: 700, color: 'var(--navy-700)', marginBottom: 4 }}>{c}</div>
            <div
              className={`dropzone ${sel ? 'over' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => { if (sel && !checked) { setPlaced({ ...placed, [sel]: ci }); setSel(null); } }}
              onKeyDown={(e) => { if (e.key === 'Enter' && sel && !checked) { setPlaced({ ...placed, [sel]: ci }); setSel(null); } }}
            >
              {Object.entries(placed).filter(([, idx]) => idx === ci).map(([n]) => (
                <span key={n} className={`token ${checked ? (correctOf(n) === ci ? 'right-b' : 'wrong-b') : ''}`} onClick={(e) => { e.stopPropagation(); if (!checked) { const p = { ...placed }; delete p[n]; setPlaced(p); } }}>
                  {n}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="row mt-2">
        {!checked ? (
          <button className="btn" disabled={remaining.length > 0} onClick={() => { setChecked(true); recordGame(`cat-${hashString(game.title)}`, game.title, Math.round((score / pool.length) * 100)); }}>
            Zuordnung prüfen
          </button>
        ) : (
          <>
            <span className={`badge ${score === pool.length ? 'ok' : 'warn'}`}>{score}/{pool.length} richtig</span>
            <button className="btn sm secondary" onClick={() => { setPlaced({}); setChecked(false); setRound(round + 1); }}>Nochmal</button>
          </>
        )}
        {!checked && <span className="small muted">Element anklicken, dann Kategorie anklicken. Zum Zurücknehmen auf ein platziertes Element klicken.</span>}
      </div>
      {checked && score < pool.length && (
        <div className="feedback bad small">
          {Object.entries(placed).filter(([n, c]) => correctOf(n) !== c).map(([n]) => (
            <div key={n}>„{n}“ gehört zu: <strong>{game.categories[correctOf(n)]}</strong></div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GameView({ game }: { game: Game }) {
  return (
    <div className="quiz">
      <div className="quiz-head">
        <strong>🎮 {game.title}</strong>
        <span className="badge teal">Lernspiel</span>
      </div>
      <p className="small muted mt-0"><Rich text={game.instructions} /></p>
      {game.kind === 'match' && <MatchGame game={game} />}
      {game.kind === 'order' && <OrderGame game={game} />}
      {game.kind === 'categorize' && <CategorizeGame game={game} />}
    </div>
  );
}
