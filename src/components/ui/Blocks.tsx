import { Link } from 'react-router-dom';
import type { Block, Device } from '../../types/content';
import { categoryById, deviceById } from '../../data/registry';
import { Rich, RichParagraphs } from '../../lib/text';
import { GameView } from '../games/Games';
import { BlockDiagramView } from './BlockDiagramView';
import { Callout, Leveled } from './Common';
import { Quiz } from './Quiz';
import { SimEmbed } from './SimEmbed';

export function DeviceMiniCard({ d }: { d: Device }) {
  const cat = categoryById.get(d.category);
  return (
    <Link to={`/geraete/${d.id}`} className="card hover" style={{ padding: 14 }}>
      <div className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
        <span className="device-card ic" style={{ background: `${cat?.color}18`, display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 10, flex: '0 0 36px' }}>
          {cat?.icon}
        </span>
        <span style={{ minWidth: 0 }}>
          <span className="card-title" style={{ display: 'block', fontSize: '0.95rem' }}>{d.name}</span>
          <span className="card-sub" style={{ display: 'block', fontSize: '0.8rem' }}>{cat?.name}</span>
        </span>
      </div>
    </Link>
  );
}

export function BlockView({ block, ctx }: { block: Block; ctx: string }) {
  switch (block.type) {
    case 'h':
      return <h3>{block.text}</h3>;
    case 'p':
      return <RichParagraphs text={block.text} />;
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag>
          {block.items.map((it, i) => (
            <li key={i}><Rich text={it} /></li>
          ))}
        </Tag>
      );
    }
    case 'callout':
      return (
        <Callout variant={block.variant} title={block.title}>
          <RichParagraphs text={block.text} />
        </Callout>
      );
    case 'leveled':
      return <Leveled levels={block.levels} title={block.title} />;
    case 'formula':
      return (
        <div className="formula">
          <div className="f">{block.display}</div>
          <p className="small mb-0"><Rich text={block.explanation} /></p>
          {block.variables && (
            <dl>
              {block.variables.map(([v, d]) => (
                <div key={v} style={{ display: 'contents' }}>
                  <dt>{v}</dt>
                  <dd><Rich text={d} /></dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      );
    case 'table':
      return (
        <div className="table-wrap">
          <table className="t">
            {block.caption && <caption>{block.caption}</caption>}
            <thead>
              <tr>{block.head.map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j}><Rich text={c} /></td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'steps':
      return (
        <div>
          {block.title && <h4>{block.title}</h4>}
          <ol className="steps">
            {block.steps.map((s, i) => (
              <li key={i}>
                <div className="st">{s.title}</div>
                <div className="small"><Rich text={s.text} /></div>
              </li>
            ))}
          </ol>
        </div>
      );
    case 'quiz':
      return <Quiz quizKey={`${ctx}:${block.questions[0]?.id ?? 'quiz'}`} title={block.title} questions={block.questions} />;
    case 'sim':
      return <SimEmbed simId={block.simId} caption={block.caption} />;
    case 'devices': {
      const list = block.deviceIds.map((id) => deviceById.get(id)).filter((d): d is Device => !!d);
      if (list.length === 0) return null;
      return (
        <div style={{ margin: '14px 0' }}>
          {block.title && <h4>{block.title}</h4>}
          <div className="grid grid-3" style={{ gap: 10 }}>
            {list.map((d) => <DeviceMiniCard key={d.id} d={d} />)}
          </div>
        </div>
      );
    }
    case 'example':
      return (
        <Callout variant="praxis" title={block.title}>
          <RichParagraphs text={block.text} />
        </Callout>
      );
    case 'game':
      return <GameView game={block.game} />;
    case 'diagram':
      return <BlockDiagramView diagram={block.diagram} caption={block.caption} />;
  }
}

export function Blocks({ blocks, ctx }: { blocks: Block[]; ctx: string }) {
  return (
    <div className="prose" style={{ maxWidth: 'none' }}>
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} ctx={ctx} />
      ))}
    </div>
  );
}
