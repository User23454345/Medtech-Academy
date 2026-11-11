import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Rendert die Inline-Syntax der Inhaltsdaten:
 * **fett**, *kursiv*, `code`, [[glossar-id|Text]], [[geraet:id|Text]],
 * [[modul:modul-id|Text]], [[lektion:lektion-id|Text]] sowie Zeilenumbrüche.
 */
const TOKEN = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[\[[^\]]+\]\])/g;

function renderLink(inner: string, key: number): ReactNode {
  const [target, label] = inner.split('|');
  const text = label ?? target.replace(/^[a-z]+:/, '');
  const [prefix, id] = target.includes(':') ? target.split(':') : ['glossar', target];
  const href =
    prefix === 'geraet'
      ? `/geraete/${id}`
      : prefix === 'modul'
        ? `/modul/${id}`
        : prefix === 'lektion'
          ? `/lektion/${id}`
          : prefix === 'sim'
            ? `/labor/${id}`
            : `/lexikon/${id}`;
  return (
    <Link key={key} to={href} className={prefix === 'glossar' ? 'term-link' : 'inline-link'}>
      {text}
    </Link>
  );
}

function renderInline(text: string): ReactNode[] {
  const parts = text.split(TOKEN);
  return parts.map((p, i) => {
    if (!p) return null;
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i}>{p.slice(1, -1)}</code>;
    if (p.startsWith('[[') && p.endsWith(']]')) return renderLink(p.slice(2, -2), i);
    if (p.length > 2 && p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

/** Inline-Text (ohne Absätze) */
export function Rich({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {renderInline(line)}
        </Fragment>
      ))}
    </>
  );
}

/** Mehrere Absätze (durch Leerzeile getrennt) */
export function RichParagraphs({ text, className }: { text: string; className?: string }) {
  return (
    <>
      {text.split(/\n\s*\n/).map((para, i) => (
        <p key={i} className={className}>
          <Rich text={para.trim()} />
        </p>
      ))}
    </>
  );
}

/** Entfernt Markup für Suche und Vorschauen */
export function plain(text: string): string {
  return text
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[(?:[a-z]+:)?([^\]]+)\]\]/g, '$1')
    .replace(/\*\*|`/g, '')
    .replace(/\*([^*]+)\*/g, '$1');
}
