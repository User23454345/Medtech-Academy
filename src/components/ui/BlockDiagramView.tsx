import { useMemo, useState } from 'react';
import type { BlockDiagram, DiagramNodeKind } from '../../types/content';
import { Rich } from '../../lib/text';
import { SchematicLabel } from './Common';

export const KIND_STYLE: Record<DiagramNodeKind, { fill: string; stroke: string; label: string }> = {
  patient: { fill: '#fdf2f8', stroke: '#db2777', label: 'Patient / Anwendungsteil' },
  supply: { fill: '#ecfeff', stroke: '#0891b2', label: 'Medien-/Flüssigkeitskreis' },
  sensor: { fill: '#f0fdfa', stroke: '#0d9488', label: 'Sensorik' },
  signal: { fill: '#eff6ff', stroke: '#2563eb', label: 'Signalverarbeitung' },
  control: { fill: '#eef2ff', stroke: '#4338ca', label: 'Steuerung / Software' },
  actuator: { fill: '#fff7ed', stroke: '#ea580c', label: 'Aktorik' },
  output: { fill: '#f5f3ff', stroke: '#7c3aed', label: 'Anzeige / Alarm / Schnittstelle' },
  power: { fill: '#fefce8', stroke: '#ca8a04', label: 'Energieversorgung' },
};

const COLUMN: Record<DiagramNodeKind, number> = {
  power: 0,
  supply: 0,
  patient: 0,
  sensor: 1,
  signal: 2,
  control: 3,
  actuator: 4,
  output: 4,
};

/**
 * Automatisch gelayoutetes Blockschaltbild. Knoten werden nach Art in Spalten
 * angeordnet (Patient → Sensorik → Signal → Steuerung → Aktorik/Ausgabe).
 */
export function BlockDiagramView({ diagram, caption }: { diagram: BlockDiagram; caption?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const layout = useMemo(() => {
    const cols: Record<number, string[]> = {};
    for (const n of diagram.nodes) (cols[COLUMN[n.kind]] ??= []).push(n.id);
    const used = Object.keys(cols)
      .map(Number)
      .sort((a, b) => a - b);
    const W = 180;
    const H = 58;
    const GX = 60;
    const GY = 26;
    const maxRows = Math.max(...used.map((c) => cols[c].length));
    const pos = new Map<string, { x: number; y: number }>();
    used.forEach((c, ci) => {
      const ids = cols[c];
      const offset = ((maxRows - ids.length) * (H + GY)) / 2;
      ids.forEach((id, ri) => pos.set(id, { x: 20 + ci * (W + GX), y: 20 + offset + ri * (H + GY) }));
    });
    return { pos, W, H, width: 40 + used.length * W + (used.length - 1) * GX, height: 40 + maxRows * H + (maxRows - 1) * GY };
  }, [diagram]);

  const activeNode = diagram.nodes.find((n) => n.id === active);
  const kinds = Array.from(new Set(diagram.nodes.map((n) => n.kind)));

  return (
    <figure style={{ margin: '16px 0' }}>
      <div className="diagram-wrap">
        <svg viewBox={`0 0 ${layout.width} ${layout.height}`} width="100%" style={{ minWidth: Math.min(layout.width, 640), display: 'block' }} role="img" aria-label={caption ?? 'Blockschaltbild'}>
          <defs>
            <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#64748b" />
            </marker>
          </defs>
          {diagram.edges.map(([from, to, label], i) => {
            const a = layout.pos.get(from);
            const b = layout.pos.get(to);
            if (!a || !b) return null;
            const { W, H } = layout;
            let x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2;
            if (Math.abs(a.x - b.x) < 1) {
              x1 = a.x + W / 2; x2 = b.x + W / 2;
              y1 = a.y < b.y ? a.y + H : a.y; y2 = a.y < b.y ? b.y : b.y + H;
            } else if (b.x < a.x) {
              x1 = a.x; x2 = b.x + W;
            }
            const mx = (x1 + x2) / 2;
            const path = Math.abs(a.x - b.x) < 1 ? `M${x1},${y1} L${x2},${y2}` : `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
            const hl = active && (from === active || to === active);
            return (
              <g key={i}>
                <path d={path} fill="none" stroke={hl ? '#0d9488' : '#94a3b8'} strokeWidth={hl ? 2.5 : 1.6} markerEnd="url(#arr)" />
                {label && (
                  <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 5} fontSize="10.5" textAnchor="middle" fill="#475569" style={{ paintOrder: 'stroke', stroke: '#f8fbff', strokeWidth: 3 }}>
                    {label}
                  </text>
                )}
              </g>
            );
          })}
          {diagram.nodes.map((n) => {
            const p = layout.pos.get(n.id)!;
            const st = KIND_STYLE[n.kind];
            return (
              <g
                key={n.id}
                className={`diagram-node ${active === n.id ? 'active' : ''}`}
                onClick={() => setActive(active === n.id ? null : n.id)}
                tabIndex={0}
                role="button"
                aria-label={n.label}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActive(n.id)}
              >
                <rect x={p.x} y={p.y} width={layout.W} height={layout.H} rx="11" fill={st.fill} stroke={st.stroke} strokeWidth={1.6} />
                <foreignObject x={p.x + 6} y={p.y + 4} width={layout.W - 12} height={layout.H - 8}>
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 12.5, fontWeight: 600, color: '#0b2545', lineHeight: 1.2, fontFamily: 'inherit' }}>
                    {n.label}
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="legend">
        {kinds.map((k) => (
          <span key={k}>
            <i style={{ background: KIND_STYLE[k].fill, border: `1.5px solid ${KIND_STYLE[k].stroke}` }} />
            {KIND_STYLE[k].label}
          </span>
        ))}
      </div>
      <div className="card mt-1" style={{ padding: 14, minHeight: 64, background: activeNode ? '#fff' : 'var(--surface-2)' }} aria-live="polite">
        {activeNode ? (
          <>
            <strong style={{ color: KIND_STYLE[activeNode.kind].stroke }}>{activeNode.label}</strong>
            <p className="mb-0 small">
              <Rich text={activeNode.info} />
            </p>
          </>
        ) : (
          <span className="small muted">👆 Klicke auf einen Block, um seine Funktion zu sehen.</span>
        )}
      </div>
      <figcaption className="row between mt-1">
        <span className="small muted">{caption}</span>
        <SchematicLabel text="Vereinfachtes Funktionsdiagramm (schematisch)" />
      </figcaption>
    </figure>
  );
}
