import { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { simById } from '../../data/registry';
import { completeSim, useProgress } from '../../lib/progress';
import { simComponents } from '../../sims/registry';

export function SimEmbed({ simId, caption, standalone }: { simId: string; caption?: string; standalone?: boolean }) {
  const meta = simById.get(simId);
  const Comp = simComponents[simId];
  const done = useProgress((s) => !!s.completedSims[simId]);
  if (!Comp) {
    return (
      <div className="callout warnung">
        <div className="callout-title">Simulation in Vorbereitung</div>
        Die Simulation „{meta?.title ?? simId}“ ist noch nicht verfügbar.
      </div>
    );
  }
  return (
    <section className="sim-frame">
      <div className="sim-frame-head">
        <h3>
          {meta?.icon ?? '🧪'} {meta?.title ?? simId}
        </h3>
        <div className="row" style={{ gap: 8 }}>
          {meta?.status === 'prototyp' && <span className="badge warn">Prototyp</span>}
          <span className="badge teal">Interaktive Simulation</span>
          {!standalone && (
            <Link to={`/labor/${simId}`} className="badge outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }}>
              Vollbild ↗
            </Link>
          )}
        </div>
      </div>
      <div className="sim-frame-body">
        <Suspense fallback={<div className="muted">Simulation wird geladen …</div>}>
          <Comp />
        </Suspense>
      </div>
      <div className="sim-note">
        {caption && <p className="mb-0">{caption}</p>}
        {meta && (
          <p className="mb-0">
            <strong>Vereinfachtes Lernmodell:</strong> {meta.simplifications} Die Simulation ersetzt keine Herstellerunterlagen,
            keine Einweisung und keine reale Prüfung.
          </p>
        )}
        <div className="row mt-1">
          {done ? (
            <span className="badge ok">✓ Erkundet</span>
          ) : (
            <button className="btn sm" onClick={() => completeSim(simId, meta?.title ?? simId)}>
              Als erkundet markieren (+25 XP)
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
