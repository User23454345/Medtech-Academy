import { Link, useParams } from 'react-router-dom';
import type { SimMeta } from '../types/content';
import { deviceById, simById, simMetas } from '../data/registry';
import { useProgress } from '../lib/progress';
import { Empty, PageHead, SourceList } from '../components/ui/Common';
import { SimEmbed } from '../components/ui/SimEmbed';
import { NotFound } from './Misc';

const GROUP: Record<SimMeta['group'], string> = {
  geraete: 'Geräte-Simulationen: Wie funktionieren Medizingeräte?',
  physik: 'Physikalische Prinzipien',
  elektronik: 'Elektronik- & Schaltungslabor',
  messtechnik: 'Virtuelles Messlabor',
  pruefung: 'Virtuelles Prüflabor',
};

export function LabPage() {
  const done = useProgress((s) => s.completedSims);
  return (
    <div>
      <PageHead kicker="Interaktives Technik-Labor" title="Wie funktionieren Medizingeräte?" lead="Nicht nur lesen – ausprobieren: Parameter verändern, Kurven beobachten, Ursache und Wirkung verstehen. Jede Simulation zeigt offen, welche Vereinfachungen das Modell trifft." />
      {simMetas.length === 0 && <Empty>Noch keine Simulationen vorhanden.</Empty>}
      {(Object.keys(GROUP) as SimMeta['group'][]).filter((g) => simMetas.some((s) => s.group === g)).map((g) => (
        <section key={g} className="section">
          <h2>{GROUP[g]}</h2>
          <div className="grid grid-3">
            {simMetas.filter((s) => s.group === g).map((s) => (
              <Link key={s.id} to={`/labor/${s.id}`} className="card hover">
                <div className="row between"><span className="ico-lg">{s.icon}</span>{done[s.id] && <span className="badge ok">✓ erkundet</span>}</div>
                <div className="card-title mt-1">{s.title}</div>
                <p className="card-sub">{s.description}</p>
                {s.status === 'prototyp' && <span className="badge warn mt-1">Prototyp</span>}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function SimPage() {
  const { id } = useParams();
  const s = id ? simById.get(id) : undefined;
  if (!s) return <NotFound />;
  return (
    <div>
      <PageHead kicker="Technik-Labor" title={`${s.icon} ${s.title}`} lead={s.description} crumbs={[['Technik-Labor', '/labor'], [s.title]]} />
      <div className="card mb-2">
        <strong>Gezeigtes Prinzip:</strong> {s.principle}
      </div>
      <SimEmbed simId={s.id} standalone />
      {s.devices && s.devices.length > 0 && (
        <div className="row">
          <strong className="small">Zugehörige Geräte:</strong>
          {s.devices.map((d) => deviceById.get(d)).filter(Boolean).map((d) => <Link key={d!.id} className="badge navy" to={`/geraete/${d!.id}`}>{d!.name}</Link>)}
        </div>
      )}
      <SourceList ids={s.sources} />
    </div>
  );
}
